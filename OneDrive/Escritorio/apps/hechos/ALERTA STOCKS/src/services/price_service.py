import logging
from typing import Optional
from enum import Enum
import time

from ..models.price_data import PriceData, APIError
from .alpha_vantage_service import alpha_vantage_service
from .coingecko_service import coingecko_service
from ..utils.logging_config import get_logger, log_api_call, log_performance

logger = get_logger(__name__)


class AssetType(Enum):
    """Types of financial assets supported."""
    STOCK = "stock"
    CRYPTO = "crypto"
    AUTO = "auto"


class PriceService:
    """Unified service for fetching prices from different APIs."""
    
    def __init__(self):
        self.alpha_vantage = alpha_vantage_service
        self.coingecko = coingecko_service
    
    async def get_price(self, symbol: str, asset_type: AssetType = AssetType.AUTO) -> PriceData:
        """
        Fetch price for the given symbol, automatically detecting asset type if needed.
        
        Args:
            symbol: Asset symbol (e.g., 'AAPL', 'bitcoin', 'BTC')
            asset_type: Type of asset (stock, crypto, or auto-detect)
            
        Returns:
            PriceData object with current price information
            
        Raises:
            APIError: If price fetching fails for all attempted services
        """
        start_time = time.time()
        symbol = symbol.strip()
        
        logger.info(f"Fetching price for {symbol}", extra={
            'extra_context': {
                'symbol': symbol,
                'asset_type': asset_type.value,
                'operation': 'get_price'
            }
        })
        
        try:
            if asset_type == AssetType.STOCK:
                result = await self._get_stock_price(symbol)
            elif asset_type == AssetType.CRYPTO:
                result = await self._get_crypto_price(symbol)
            else:
                # Auto-detect asset type
                result = await self._auto_detect_and_fetch(symbol)
            
            duration_ms = (time.time() - start_time) * 1000
            log_performance("price_fetch", duration_ms, 
                          symbol=symbol, asset_type=asset_type.value, 
                          price=result.current_price, source=result.source)
            
            return result
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(f"Failed to get price for {symbol}", exc_info=e, extra={
                'duration_ms': duration_ms,
                'extra_context': {
                    'symbol': symbol,
                    'asset_type': asset_type.value,
                    'operation': 'get_price'
                }
            })
            raise
    
    async def _get_stock_price(self, symbol: str) -> PriceData:
        """Fetch stock price using Alpha Vantage."""
        start_time = time.time()
        try:
            result = await self.alpha_vantage.get_stock_price(symbol)
            duration_ms = (time.time() - start_time) * 1000
            
            log_api_call("alpha_vantage", f"/query?symbol={symbol}", 
                        status_code=200, duration_ms=duration_ms,
                        symbol=symbol, price=result.current_price)
            return result
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            log_api_call("alpha_vantage", f"/query?symbol={symbol}",
                        status_code=None, duration_ms=duration_ms, 
                        error=e, symbol=symbol)
            
            logger.error(f"Failed to fetch stock price for {symbol}", exc_info=e, extra={
                'extra_context': {
                    'symbol': symbol,
                    'api': 'alpha_vantage',
                    'operation': 'get_stock_price'
                }
            })
            raise APIError(
                f"Failed to fetch stock price for {symbol}: {str(e)}",
                "stock_api"
            )
    
    async def _get_crypto_price(self, symbol: str) -> PriceData:
        """Fetch cryptocurrency price using CoinGecko."""
        start_time = time.time()
        try:
            result = await self.coingecko.get_crypto_price(symbol)
            duration_ms = (time.time() - start_time) * 1000
            
            log_api_call("coingecko", f"/simple/price?ids={symbol}", 
                        status_code=200, duration_ms=duration_ms,
                        symbol=symbol, price=result.current_price)
            return result
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            log_api_call("coingecko", f"/simple/price?ids={symbol}",
                        status_code=None, duration_ms=duration_ms,
                        error=e, symbol=symbol)
                        
            logger.error(f"Failed to fetch crypto price for {symbol}", exc_info=e, extra={
                'extra_context': {
                    'symbol': symbol,
                    'api': 'coingecko',
                    'operation': 'get_crypto_price'
                }
            })
            raise APIError(
                f"Failed to fetch crypto price for {symbol}: {str(e)}",
                "crypto_api"
            )
    
    async def _auto_detect_and_fetch(self, symbol: str) -> PriceData:
        """
        Auto-detect asset type and fetch price from appropriate API.
        
        Strategy:
        1. If symbol looks like a stock symbol (short, all caps), try stocks first
        2. If symbol looks like crypto (known crypto symbols or longer names), try crypto first
        3. If first attempt fails, try the other API
        4. If both fail, raise the most relevant error
        """
        # Heuristics for auto-detection
        is_likely_stock = (
            len(symbol) <= 5 and 
            symbol.upper() == symbol and 
            symbol.isalpha() and
            not self._is_known_crypto_symbol(symbol.lower())
        )
        
        is_likely_crypto = (
            self._is_known_crypto_symbol(symbol.lower()) or
            len(symbol) > 5 or
            not symbol.isalpha()
        )
        
        # Define attempt order based on heuristics
        if is_likely_stock and not is_likely_crypto:
            first_attempt = ("stock", self._get_stock_price)
            second_attempt = ("crypto", self._get_crypto_price)
        elif is_likely_crypto and not is_likely_stock:
            first_attempt = ("crypto", self._get_crypto_price)
            second_attempt = ("stock", self._get_stock_price)
        else:
            # Default: try crypto first (more forgiving API)
            first_attempt = ("crypto", self._get_crypto_price)
            second_attempt = ("stock", self._get_stock_price)
        
        # Try first API
        try:
            logger.info(f"Auto-detecting {symbol}: trying {first_attempt[0]} API first", extra={
                'extra_context': {
                    'symbol': symbol,
                    'first_attempt': first_attempt[0],
                    'detection_heuristics': {
                        'is_likely_stock': is_likely_stock,
                        'is_likely_crypto': is_likely_crypto,
                        'symbol_length': len(symbol),
                        'is_alpha': symbol.isalpha()
                    }
                }
            })
            return await first_attempt[1](symbol)
        except Exception as first_error:
            logger.warning(f"{first_attempt[0].title()} API failed for {symbol}", exc_info=first_error, extra={
                'extra_context': {
                    'symbol': symbol,
                    'failed_api': first_attempt[0],
                    'will_retry': True
                }
            })
            
            # Try second API
            try:
                logger.info(f"Trying {second_attempt[0]} API for {symbol}")
                return await second_attempt[1](symbol)
            except Exception as second_error:
                logger.error(f"Both APIs failed for {symbol}", extra={
                    'extra_context': {
                        'symbol': symbol,
                        'first_api': first_attempt[0],
                        'second_api': second_attempt[0],
                        'first_error': str(first_error),
                        'second_error': str(second_error)
                    }
                })
                
                # Raise the more relevant error
                if "not found" in str(first_error).lower() and "not found" in str(second_error).lower():
                    raise APIError(
                        f"Symbol {symbol} not found in any supported API (tried {first_attempt[0]} and {second_attempt[0]})",
                        "auto_detect"
                    )
                else:
                    # Return the first error as it was our best guess
                    raise first_error
    
    def _is_known_crypto_symbol(self, symbol: str) -> bool:
        """Check if symbol is a known cryptocurrency symbol."""
        known_crypto_symbols = {
            "btc", "bitcoin",
            "eth", "ethereum", 
            "bnb", "binancecoin",
            "ada", "cardano",
            "dot", "polkadot",
            "sol", "solana",
            "xrp", "ripple",
            "matic", "polygon",
            "avax", "avalanche",
            "ltc", "litecoin",
            "bch", "bitcoin-cash",
            "etc", "ethereum-classic",
            "xlm", "stellar",
            "xmr", "monero",
            "trx", "tron",
            "eos", "eos",
            "neo", "neo",
            "dash", "dash",
            "zcash", "zcash",
            "dcr", "decred",
            "doge", "dogecoin",
            "shib", "shiba-inu",
            "usdt", "tether",
            "usdc", "usd-coin",
            "busd", "binance-usd"
        }
        
        return symbol in known_crypto_symbols


# Global service instance
price_service = PriceService()