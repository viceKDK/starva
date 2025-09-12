import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

import httpx

from ..models.price_data import PriceData, APIError, RateLimitError
from ..utils.rate_limiter import exponential_backoff_retry, RateLimiter
from .price_cache import price_cache

logger = logging.getLogger(__name__)


class CoinGeckoService:
    """Service for fetching cryptocurrency prices from CoinGecko API."""
    
    BASE_URL = "https://api.coingecko.com/api/v3"
    SOURCE_NAME = "coingecko"
    
    def __init__(self):
        self.rate_limiter = RateLimiter(calls_per_second=0.167)  # 10 calls per minute for free tier
    
    async def get_crypto_price(self, symbol: str) -> PriceData:
        """
        Fetch current cryptocurrency price for the given symbol.
        
        Args:
            symbol: Cryptocurrency symbol or ID (e.g., 'bitcoin', 'ethereum', 'BTC')
            
        Returns:
            PriceData object with current price information
            
        Raises:
            APIError: If API call fails or returns invalid data
            RateLimitError: If rate limit is exceeded
        """
        # Normalize symbol to CoinGecko ID format
        coin_id = self._normalize_symbol(symbol)
        
        # Check cache first
        cached_price = await price_cache.get(coin_id, self.SOURCE_NAME)
        if cached_price:
            logger.info(f"Returning cached price for {symbol}")
            return cached_price
        
        logger.info(f"Fetching crypto price for {symbol} (ID: {coin_id}) from CoinGecko")
        
        async def fetch_price():
            await self.rate_limiter.acquire()
            
            url = f"{self.BASE_URL}/simple/price"
            params = {
                "ids": coin_id,
                "vs_currencies": "usd",
                "include_last_updated_at": "true"
            }
            
            logger.debug(f"Making CoinGecko API request: {url} with params: {params}")
            async with httpx.AsyncClient(timeout=10.0) as client:  # Reduced timeout from 30s to 10s
                try:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    
                    data = response.json()
                    logger.debug(f"CoinGecko API response received for {symbol}")
                    return self._parse_response(data, coin_id, symbol)
                    
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 429:
                        raise RateLimitError(
                            "CoinGecko rate limit exceeded",
                            self.SOURCE_NAME,
                            retry_after=60
                        )
                    else:
                        raise APIError(
                            f"HTTP error {e.response.status_code}: {e.response.text}",
                            self.SOURCE_NAME,
                            e.response.status_code
                        )
                
                except httpx.RequestError as e:
                    raise APIError(
                        f"Network error: {str(e)}",
                        self.SOURCE_NAME
                    )
        
        try:
            price_data = await exponential_backoff_retry(
                fetch_price,
                max_retries=2,
                base_delay=1.0
            )
            
            # Cache the result
            await price_cache.set(coin_id, self.SOURCE_NAME, price_data)
            
            return price_data
            
        except Exception as e:
            logger.error(f"Failed to fetch crypto price for {symbol}: {e}")
            raise

    async def get_crypto_price_with_change(self, symbol: str) -> Dict[str, float]:
        """Return current price and 24h percentage change for a coin.
        Keys: price, change_24h
        """
        coin_id = self._normalize_symbol(symbol)
        await self.rate_limiter.acquire()
        url = f"{self.BASE_URL}/simple/price"
        params = {
            "ids": coin_id,
            "vs_currencies": "usd",
            "include_24hr_change": "true",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
        if coin_id not in data:
            raise APIError(f"No price data found for symbol {symbol}", self.SOURCE_NAME)
        price = float(data[coin_id].get("usd", 0.0))
        change = float(data[coin_id].get("usd_24h_change", 0.0))
        return {"price": price, "change_24h": change}
    
    def _normalize_symbol(self, symbol: str) -> str:
        """
        Normalize cryptocurrency symbol to CoinGecko ID format.
        
        Args:
            symbol: Input symbol
            
        Returns:
            CoinGecko ID string
        """
        symbol_lower = symbol.lower()
        
        # Common symbol mappings
        symbol_mapping = {
            "btc": "bitcoin",
            "eth": "ethereum",
            "bnb": "binancecoin",
            "ada": "cardano",
            "dot": "polkadot",
            "sol": "solana",
            "xrp": "ripple",
            "matic": "matic-network",
            "avax": "avalanche-2",
            "ltc": "litecoin",
            "bch": "bitcoin-cash",
            "etc": "ethereum-classic",
            "xlm": "stellar",
            "xmr": "monero",
            "trx": "tron",
            "eos": "eos",
            "neo": "neo",
            "dash": "dash",
            "zcash": "zcash",
            "dcr": "decred"
        }
        
        return symbol_mapping.get(symbol_lower, symbol_lower)
    
    def _parse_response(self, data: Dict[str, Any], coin_id: str, original_symbol: str) -> PriceData:
        """
        Parse CoinGecko API response into PriceData object.
        
        Args:
            data: Raw API response data
            coin_id: CoinGecko coin ID
            original_symbol: Original symbol provided by user
            
        Returns:
            PriceData object
            
        Raises:
            APIError: If response format is invalid or contains no data
        """
        try:
            # Check if coin data exists
            if not data or coin_id not in data:
                raise APIError(
                    f"No price data found for symbol {original_symbol} (ID: {coin_id})",
                    self.SOURCE_NAME
                )
            
            coin_data = data[coin_id]
            
            # Extract price
            current_price = coin_data.get("usd")
            if current_price is None:
                raise APIError(
                    f"No USD price found for {original_symbol}",
                    self.SOURCE_NAME
                )
            
            current_price = float(current_price)
            
            if current_price <= 0:
                raise APIError(
                    f"Invalid price data for {original_symbol}: {current_price}",
                    self.SOURCE_NAME
                )
            
            # Extract timestamp (optional)
            timestamp = datetime.now()
            if "last_updated_at" in coin_data:
                try:
                    timestamp = datetime.fromtimestamp(coin_data["last_updated_at"])
                except (ValueError, TypeError):
                    # Use current time if parsing fails
                    pass
            
            return PriceData(
                symbol=original_symbol.upper(),
                current_price=current_price,
                timestamp=timestamp,
                source=self.SOURCE_NAME
            )
            
        except (KeyError, ValueError, TypeError) as e:
            logger.error(f"Failed to parse CoinGecko response: {data}")
            raise APIError(
                f"Invalid response format: {str(e)}",
                self.SOURCE_NAME
            )


# Global service instance
coingecko_service = CoinGeckoService()
