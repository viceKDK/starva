"""
Alpha Vantage provider implementing PriceProviderInterface
Follows Strategy Pattern and Single Responsibility Principle
"""

import re
from typing import Optional

from ..interfaces.price_provider import PriceProviderInterface, AssetType
from ..models.price_data import PriceData
from ..services.alpha_vantage_service import alpha_vantage_service
from ..utils.logging_config import get_logger

logger = get_logger(__name__)


class AlphaVantageProvider(PriceProviderInterface):
    """Alpha Vantage price provider for stocks"""
    
    def __init__(self):
        self.service = alpha_vantage_service
        self.provider_name = "Alpha Vantage"
        self.priority = 1  # High priority for stocks
    
    async def get_price(self, symbol: str) -> PriceData:
        """Get stock price from Alpha Vantage"""
        try:
            return await self.service.get_stock_price(symbol)
        except Exception as e:
            logger.error(f"Alpha Vantage price fetch failed for {symbol}", exc_info=e)
            raise
    
    def can_handle(self, symbol: str, asset_type: Optional[AssetType] = None) -> bool:
        """Check if this provider can handle the symbol"""
        # Handle explicit stock requests
        if asset_type == AssetType.STOCK:
            return True
        
        # Handle auto-detection for stock-like symbols
        if asset_type is None or asset_type == AssetType.STOCK:
            return self._is_stock_symbol(symbol)
        
        return False
    
    def get_provider_name(self) -> str:
        """Get provider name"""
        return self.provider_name
    
    def get_priority(self) -> int:
        """Get provider priority for stocks"""
        return self.priority
    
    def _is_stock_symbol(self, symbol: str) -> bool:
        """Determine if symbol looks like a stock symbol"""
        symbol = symbol.strip().upper()
        
        # Basic stock symbol patterns
        # 1-5 characters, all uppercase, may contain dots for class shares
        if re.match(r'^[A-Z]{1,5}(\.[A-Z])?$', symbol):
            return True
        
        # Common stock exchanges suffixes
        if re.match(r'^[A-Z]{1,5}\.(L|TO|V|CN|HK)$', symbol):
            return True
        
        return False