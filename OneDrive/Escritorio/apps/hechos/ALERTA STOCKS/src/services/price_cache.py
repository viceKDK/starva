import asyncio
import logging
import time
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from ..models.price_data import PriceData

logger = logging.getLogger(__name__)


class PriceCache:
    """In-memory cache for price data with TTL support."""
    
    def __init__(self, ttl_seconds: int = 30):
        self.ttl_seconds = ttl_seconds
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()
    
    def _generate_key(self, symbol: str, source: str) -> str:
        """Generate cache key from symbol and source."""
        return f"{source}:{symbol.lower()}"
    
    async def get(self, symbol: str, source: str) -> Optional[PriceData]:
        """Get cached price data if not expired."""
        async with self._lock:
            key = self._generate_key(symbol, source)
            
            if key not in self._cache:
                return None
            
            cached_item = self._cache[key]
            cached_time = cached_item["timestamp"]
            
            # Check if cache entry has expired
            if time.time() - cached_time > self.ttl_seconds:
                del self._cache[key]
                logger.debug(f"Cache expired for {key}")
                return None
            
            logger.debug(f"Cache hit for {key}")
            return cached_item["data"]
    
    async def set(self, symbol: str, source: str, price_data: PriceData) -> None:
        """Store price data in cache with current timestamp."""
        async with self._lock:
            key = self._generate_key(symbol, source)
            
            self._cache[key] = {
                "data": price_data,
                "timestamp": time.time()
            }
            
            logger.debug(f"Cached price data for {key}")
    
    async def clear(self) -> None:
        """Clear all cached data."""
        async with self._lock:
            self._cache.clear()
            logger.debug("Cache cleared")
    
    async def cleanup_expired(self) -> None:
        """Remove expired entries from cache."""
        async with self._lock:
            current_time = time.time()
            expired_keys = [
                key for key, value in self._cache.items()
                if current_time - value["timestamp"] > self.ttl_seconds
            ]
            
            for key in expired_keys:
                del self._cache[key]
            
            if expired_keys:
                logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")


# Global cache instance
price_cache = PriceCache(ttl_seconds=30)