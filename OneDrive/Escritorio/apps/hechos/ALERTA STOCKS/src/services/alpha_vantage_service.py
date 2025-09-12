import logging
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple

import httpx

from ..config.settings import settings
from ..models.price_data import PriceData, APIError, RateLimitError
from ..utils.rate_limiter import exponential_backoff_retry, RateLimiter
from .price_cache import price_cache

logger = logging.getLogger(__name__)


class AlphaVantageService:
    """Service for fetching stock prices from Alpha Vantage API."""
    
    BASE_URL = "https://www.alphavantage.co/query"
    SOURCE_NAME = "alpha_vantage"
    
    def __init__(self):
        self.api_key = settings.ALPHA_VANTAGE_API_KEY
        self.rate_limiter = RateLimiter(calls_per_second=0.2)  # 5 calls per minute
        
        if not self.api_key:
            logger.warning("Alpha Vantage API key not configured")
    
    async def get_stock_price(self, symbol: str) -> PriceData:
        """
        Fetch current stock price for the given symbol.
        
        Args:
            symbol: Stock symbol (e.g., 'AAPL', 'GOOGL')
            
        Returns:
            PriceData object with current price information
            
        Raises:
            APIError: If API call fails or returns invalid data
            RateLimitError: If rate limit is exceeded
        """
        if not self.api_key:
            raise APIError(
                "Alpha Vantage API key not configured",
                self.SOURCE_NAME
            )
        
        # Check cache first
        cached_price = await price_cache.get(symbol, self.SOURCE_NAME)
        if cached_price:
            logger.info(f"Returning cached price for {symbol}")
            return cached_price
        
        logger.info(f"Fetching stock price for {symbol} from Alpha Vantage")
        
        async def fetch_price():
            await self.rate_limiter.acquire()
            
            params = {
                "function": "GLOBAL_QUOTE",
                "symbol": symbol.upper(),
                "apikey": self.api_key
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                try:
                    response = await client.get(self.BASE_URL, params=params)
                    response.raise_for_status()
                    
                    data = response.json()
                    return self._parse_response(data, symbol)
                    
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 429:
                        raise RateLimitError(
                            "Alpha Vantage rate limit exceeded",
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
            await price_cache.set(symbol, self.SOURCE_NAME, price_data)
            
            return price_data
            
        except Exception as e:
            logger.error(f"Failed to fetch stock price for {symbol}: {e}")
            raise

    async def get_global_quote(self, symbol: str) -> Dict[str, float]:
        """Fetch Global Quote raw fields: current price, previous close, change percent.
        Returns dict with keys: price, previous_close, change_percent
        """
        if not self.api_key:
            raise APIError("Alpha Vantage API key not configured", self.SOURCE_NAME)

        params = {
            "function": "GLOBAL_QUOTE",
            "symbol": symbol.upper(),
            "apikey": self.api_key,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(self.BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
        gq = data.get("Global Quote", {})
        if not gq:
            raise APIError(f"No Global Quote for {symbol}", self.SOURCE_NAME)
        def f(key: str, default: float = 0.0) -> float:
            try:
                return float(gq.get(key, default))
            except Exception:
                return default
        price = f("05. price", 0.0)
        prev = f("08. previous close", 0.0)
        change_pct_str = gq.get("10. change percent", "0%")
        try:
            change_pct = float(str(change_pct_str).replace("%", "").strip())
        except Exception:
            change_pct = 0.0
        return {"price": price, "previous_close": prev, "change_percent": change_pct}

    async def get_rsi(self, symbol: str, interval: str = "daily", time_period: int = 14) -> float:
        """Fetch latest RSI value using Alpha Vantage technical indicator endpoint."""
        if not self.api_key:
            raise APIError("Alpha Vantage API key not configured", self.SOURCE_NAME)
        params = {
            "function": "RSI",
            "symbol": symbol.upper(),
            "interval": interval,
            "time_period": str(time_period),
            "series_type": "close",
            "apikey": self.api_key,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(self.BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
        ts = data.get("Technical Analysis: RSI", {})
        if not ts:
            raise APIError(f"No RSI data for {symbol}", self.SOURCE_NAME)
        # Get most recent value
        latest_key = sorted(ts.keys())[-1]
        return float(ts[latest_key]["RSI"])

    async def get_sma(self, symbol: str, interval: str = "daily", time_period: int = 14) -> float:
        """Fetch latest SMA value using Alpha Vantage indicator endpoint."""
        if not self.api_key:
            raise APIError("Alpha Vantage API key not configured", self.SOURCE_NAME)
        params = {
            "function": "SMA",
            "symbol": symbol.upper(),
            "interval": interval,
            "time_period": str(time_period),
            "series_type": "close",
            "apikey": self.api_key,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(self.BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
        ts = data.get("Technical Analysis: SMA", {})
        if not ts:
            raise APIError(f"No SMA data for {symbol}", self.SOURCE_NAME)
        latest_key = sorted(ts.keys())[-1]
        return float(ts[latest_key]["SMA"])

    async def _get_indicator_series(self, function_name: str, symbol: str, interval: str, time_period: int, series_label: str) -> List[Tuple[str, float]]:
        if not self.api_key:
            raise APIError("Alpha Vantage API key not configured", self.SOURCE_NAME)
        params = {
            "function": function_name,
            "symbol": symbol.upper(),
            "interval": interval,
            "time_period": str(time_period),
            "series_type": "close",
            "apikey": self.api_key,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(self.BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
        ts = data.get(f"Technical Analysis: {function_name}", {})
        if not ts:
            raise APIError(f"No {function_name} data for {symbol}", self.SOURCE_NAME)
        items = []
        for k, v in ts.items():
            try:
                items.append((k, float(v[series_label])))
            except Exception:
                continue
        # sort by timestamp ascending
        items.sort(key=lambda x: x[0])
        return items

    async def get_rsi_series(self, symbol: str, interval: str = "daily", time_period: int = 14, points: int = 2) -> List[float]:
        series = await self._get_indicator_series("RSI", symbol, interval, time_period, "RSI")
        return [v for _, v in series[-points:]]

    async def get_sma_series(self, symbol: str, interval: str = "daily", time_period: int = 14, points: int = 2) -> List[float]:
        series = await self._get_indicator_series("SMA", symbol, interval, time_period, "SMA")
        return [v for _, v in series[-points:]]

    def _parse_response(self, data: Dict[str, Any], symbol: str) -> PriceData:
        """
        Parse Alpha Vantage API response into PriceData object.
        
        Args:
            data: Raw API response data
            symbol: Stock symbol
            
        Returns:
            PriceData object
            
        Raises:
            APIError: If response format is invalid or contains error
        """
        try:
            # Check for API error messages
            if "Error Message" in data:
                raise APIError(
                    f"Alpha Vantage error: {data['Error Message']}",
                    self.SOURCE_NAME
                )
            
            if "Note" in data:
                raise RateLimitError(
                    f"Alpha Vantage rate limit: {data['Note']}",
                    self.SOURCE_NAME,
                    retry_after=60
                )
            
            # Extract price data from Global Quote
            global_quote = data.get("Global Quote", {})
            
            if not global_quote:
                raise APIError(
                    f"No price data found for symbol {symbol}",
                    self.SOURCE_NAME
                )
            
            # Parse price from the response
            current_price = float(global_quote.get("05. price", 0))
            
            if current_price <= 0:
                raise APIError(
                    f"Invalid price data for {symbol}: {current_price}",
                    self.SOURCE_NAME
                )
            
            return PriceData(
                symbol=symbol.upper(),
                current_price=current_price,
                timestamp=datetime.now(),
                source=self.SOURCE_NAME
            )
            
        except (KeyError, ValueError, TypeError) as e:
            logger.error(f"Failed to parse Alpha Vantage response: {data}")
            raise APIError(
                f"Invalid response format: {str(e)}",
                self.SOURCE_NAME
            )


# Global service instance
alpha_vantage_service = AlphaVantageService()
