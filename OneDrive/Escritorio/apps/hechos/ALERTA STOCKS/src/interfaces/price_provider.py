"""
Price provider interfaces following Strategy Pattern and Open/Closed Principle
"""

from abc import ABC, abstractmethod
from typing import List, Optional
from enum import Enum

from ..models.price_data import PriceData


class AssetType(Enum):
    """Types of financial assets supported"""
    STOCK = "stock"
    CRYPTO = "crypto"


class PriceProviderInterface(ABC):
    """Abstract interface for price data providers"""
    
    @abstractmethod
    async def get_price(self, symbol: str) -> PriceData:
        """Get current price for symbol"""
        pass
    
    @abstractmethod
    def can_handle(self, symbol: str, asset_type: Optional[AssetType] = None) -> bool:
        """Check if this provider can handle the given symbol"""
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Get provider name for logging/identification"""
        pass
    
    @abstractmethod
    def get_priority(self) -> int:
        """Get provider priority (lower number = higher priority)"""
        pass


class NotificationProviderInterface(ABC):
    """Abstract interface for notification providers"""
    
    @abstractmethod
    async def send_alert(self, message: str, recipient: str) -> bool:
        """Send alert notification"""
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Get provider name"""
        pass
    
    @abstractmethod
    async def is_available(self) -> bool:
        """Check if provider is available"""
        pass


class CacheProviderInterface(ABC):
    """Abstract interface for caching providers"""
    
    @abstractmethod
    async def get(self, key: str) -> Optional[str]:
        """Get value from cache"""
        pass
    
    @abstractmethod
    async def set(self, key: str, value: str, ttl: int = 300) -> bool:
        """Set value in cache with TTL in seconds"""
        pass
    
    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        pass
    
    @abstractmethod
    async def clear(self) -> bool:
        """Clear all cache"""
        pass