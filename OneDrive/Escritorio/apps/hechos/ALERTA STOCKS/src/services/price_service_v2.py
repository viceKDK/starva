"""
Refactored Price service using Strategy Pattern and SOLID principles
"""

import time
from typing import List, Optional
from enum import Enum

from ..models.price_data import PriceData, APIError
from ..interfaces.price_provider import PriceProviderInterface, AssetType
from ..utils.logging_config import get_logger, log_performance

logger = get_logger(__name__)


class PriceServiceV2:
    """
    Unified service for fetching prices using Strategy Pattern
    Follows Open/Closed and Dependency Inversion principles
    """
    
    def __init__(self, providers: List[PriceProviderInterface]):
        """
        Initialize with list of price providers
        
        Args:
            providers: List of price provider implementations
        """
        self.providers = sorted(providers, key=lambda p: p.get_priority())
        logger.info(f"PriceService initialized with {len(self.providers)} providers", extra={
            'extra_context': {
                'providers': [p.get_provider_name() for p in self.providers]
            }
        })
    
    async def get_price(self, symbol: str, asset_type: Optional[AssetType] = None) -> PriceData:
        """
        Fetch price using appropriate provider based on Strategy Pattern
        
        Args:
            symbol: Asset symbol (e.g., 'AAPL', 'bitcoin', 'BTC')
            asset_type: Type of asset or None for auto-detection
            
        Returns:
            PriceData object with current price information
            
        Raises:
            APIError: If price fetching fails for all providers
        """
        start_time = time.time()
        symbol = symbol.strip()
        
        logger.info(f"Fetching price for {symbol}", extra={
            'extra_context': {
                'symbol': symbol,
                'asset_type': asset_type.value if asset_type else 'auto',
                'operation': 'get_price'
            }
        })
        
        # Find suitable providers
        suitable_providers = self._find_suitable_providers(symbol, asset_type)
        
        if not suitable_providers:
            raise APIError(
                f"No providers available for symbol: {symbol}",
                "price_service"
            )
        
        # Try providers in priority order
        last_error = None
        for provider in suitable_providers:
            try:
                logger.debug(f"Trying provider {provider.get_provider_name()} for {symbol}")
                
                result = await provider.get_price(symbol)
                
                duration_ms = (time.time() - start_time) * 1000
                log_performance("price_fetch", duration_ms, 
                              symbol=symbol, 
                              asset_type=asset_type.value if asset_type else 'auto', 
                              price=result.current_price, 
                              source=result.source,
                              provider=provider.get_provider_name())
                
                logger.info(f"Price fetched successfully from {provider.get_provider_name()}", extra={
                    'extra_context': {
                        'symbol': symbol,
                        'price': result.current_price,
                        'provider': provider.get_provider_name(),
                        'duration_ms': duration_ms
                    }
                })
                
                return result
                
            except Exception as e:
                last_error = e
                logger.warning(f"Provider {provider.get_provider_name()} failed for {symbol}: {str(e)}")
                continue
        
        # All providers failed
        duration_ms = (time.time() - start_time) * 1000
        logger.error(f"All providers failed for {symbol}", exc_info=last_error, extra={
            'extra_context': {
                'symbol': symbol,
                'asset_type': asset_type.value if asset_type else 'auto',
                'tried_providers': [p.get_provider_name() for p in suitable_providers],
                'duration_ms': duration_ms
            }
        })
        
        raise APIError(
            f"Failed to fetch price for {symbol} from all available providers",
            "price_service"
        ) from last_error
    
    def _find_suitable_providers(self, symbol: str, asset_type: Optional[AssetType]) -> List[PriceProviderInterface]:
        """
        Find providers that can handle the given symbol
        
        Returns providers sorted by priority (ascending)
        """
        suitable = []
        
        for provider in self.providers:
            try:
                if provider.can_handle(symbol, asset_type):
                    suitable.append(provider)
            except Exception as e:
                logger.warning(f"Error checking if provider {provider.get_provider_name()} can handle {symbol}: {e}")
                continue
        
        return suitable
    
    def get_available_providers(self) -> List[str]:
        """Get list of available provider names"""
        return [provider.get_provider_name() for provider in self.providers]
    
    def add_provider(self, provider: PriceProviderInterface) -> None:
        """Add a new provider (Open/Closed principle - open for extension)"""
        self.providers.append(provider)
        self.providers.sort(key=lambda p: p.get_priority())
        logger.info(f"Added provider: {provider.get_provider_name()}")
    
    def remove_provider(self, provider_name: str) -> bool:
        """Remove a provider by name"""
        original_count = len(self.providers)
        self.providers = [p for p in self.providers if p.get_provider_name() != provider_name]
        removed = len(self.providers) < original_count
        
        if removed:
            logger.info(f"Removed provider: {provider_name}")
        else:
            logger.warning(f"Provider not found for removal: {provider_name}")
            
        return removed