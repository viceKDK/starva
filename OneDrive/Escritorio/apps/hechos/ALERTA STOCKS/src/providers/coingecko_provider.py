"""
CoinGecko provider implementing PriceProviderInterface
Follows Strategy Pattern and Single Responsibility Principle
"""

import re
from typing import Optional

from ..interfaces.price_provider import PriceProviderInterface, AssetType
from ..models.price_data import PriceData
from ..services.coingecko_service import coingecko_service
from ..utils.logging_config import get_logger

logger = get_logger(__name__)


class CoinGeckoProvider(PriceProviderInterface):
    """CoinGecko price provider for cryptocurrencies"""
    
    # Known crypto symbols for faster detection
    COMMON_CRYPTO_SYMBOLS = {
        'bitcoin', 'btc', 'ethereum', 'eth', 'binancecoin', 'bnb',
        'cardano', 'ada', 'solana', 'sol', 'polkadot', 'dot',
        'dogecoin', 'doge', 'avalanche-2', 'avax', 'polygon', 'matic',
        'chainlink', 'link', 'litecoin', 'ltc', 'uniswap', 'uni',
        'bitcoin-cash', 'bch', 'stellar', 'xlm', 'cosmos', 'atom',
        'monero', 'xmr', 'ethereum-classic', 'etc', 'tron', 'trx'
    }
    
    def __init__(self):
        self.service = coingecko_service
        self.provider_name = "CoinGecko"
        self.priority = 2  # Lower priority than Alpha Vantage for ambiguous symbols
    
    async def get_price(self, symbol: str) -> PriceData:
        """Get crypto price from CoinGecko"""
        try:
            return await self.service.get_crypto_price(symbol)
        except Exception as e:
            logger.error(f"CoinGecko price fetch failed for {symbol}", exc_info=e)
            raise
    
    def can_handle(self, symbol: str, asset_type: Optional[AssetType] = None) -> bool:
        """Check if this provider can handle the symbol"""
        # Handle explicit crypto requests
        if asset_type == AssetType.CRYPTO:
            return True
        
        # Handle auto-detection for crypto-like symbols
        if asset_type is None or asset_type == AssetType.CRYPTO:
            return self._is_crypto_symbol(symbol)
        
        return False
    
    def get_provider_name(self) -> str:
        """Get provider name"""
        return self.provider_name
    
    def get_priority(self) -> int:
        """Get provider priority for crypto"""
        return self.priority
    
    def _is_crypto_symbol(self, symbol: str) -> bool:
        """Determine if symbol looks like a cryptocurrency"""
        symbol_lower = symbol.strip().lower()
        
        # Check against known crypto symbols
        if symbol_lower in self.COMMON_CRYPTO_SYMBOLS:
            return True
        
        # Check common crypto patterns
        # Long names like "bitcoin", "ethereum"
        if len(symbol_lower) > 5 and re.match(r'^[a-z]+(-[a-z0-9]+)*$', symbol_lower):
            return True
        
        # Short symbols that are typically crypto (3-5 chars, mixed case or all caps)
        if 3 <= len(symbol) <= 5:
            # If it has lowercase letters, likely crypto
            if any(c.islower() for c in symbol):
                return True
            
            # If all caps but common crypto abbreviations
            if symbol.upper() in ['BTC', 'ETH', 'ADA', 'DOT', 'SOL', 'BNB', 'MATIC', 'AVAX']:
                return True
        
        # CoinGecko ID format
        if '-' in symbol_lower and not symbol_lower.endswith('.l'):  # not London exchange
            return True
        
        return False