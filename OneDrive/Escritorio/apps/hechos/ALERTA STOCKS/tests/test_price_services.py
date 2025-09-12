import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime
import httpx

from src.services.alpha_vantage_service import AlphaVantageService
from src.services.coingecko_service import CoinGeckoService
from src.services.price_service import PriceService, AssetType
from src.services.price_cache import price_cache
from src.models.price_data import PriceData, APIError, RateLimitError




class TestAlphaVantageService:
    """Test cases for Alpha Vantage service."""
    
    @pytest.fixture
    def service(self):
        return AlphaVantageService()
    
    @pytest.fixture
    def mock_alpha_vantage_response(self):
        return {
            "Global Quote": {
                "01. symbol": "AAPL",
                "05. price": "150.25"
            }
        }
    
    @pytest.mark.asyncio
    async def test_get_stock_price_success(self, service, mock_alpha_vantage_response):
        with patch.object(service, 'api_key', 'test_key'):
            with patch('httpx.AsyncClient') as mock_client:
                mock_response = MagicMock()
                mock_response.json.return_value = mock_alpha_vantage_response
                mock_response.raise_for_status = MagicMock()
                
                mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
                
                price_data = await service.get_stock_price("AAPL")
                
                assert isinstance(price_data, PriceData)
                assert price_data.symbol == "AAPL"
                assert price_data.current_price == 150.25
                assert price_data.source == "alpha_vantage"
    
    @pytest.mark.asyncio
    async def test_get_stock_price_no_api_key(self, service):
        with patch.object(service, 'api_key', ''):
            with pytest.raises(APIError) as exc_info:
                await service.get_stock_price("AAPL")
            
            assert "API key not configured" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_get_stock_price_api_error(self, service):
        with patch.object(service, 'api_key', 'test_key'):
            with patch('httpx.AsyncClient') as mock_client:
                mock_response = MagicMock()
                mock_response.json.return_value = {"Error Message": "Invalid symbol"}
                mock_response.raise_for_status = MagicMock()
                
                mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
                
                with pytest.raises(APIError) as exc_info:
                    await service.get_stock_price("INVALID")
                
                assert "Alpha Vantage error" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_get_stock_price_rate_limit(self, service):
        with patch.object(service, 'api_key', 'test_key'):
            with patch('httpx.AsyncClient') as mock_client:
                mock_response = MagicMock()
                mock_response.status_code = 429
                mock_response.text = "Rate limit exceeded"
                
                http_error = httpx.HTTPStatusError(
                    "Rate limit exceeded",
                    request=MagicMock(),
                    response=mock_response
                )
                
                mock_client.return_value.__aenter__.return_value.get.side_effect = http_error
                
                # The exponential backoff will retry and eventually raise the exception
                # After retries, it should still be a RateLimitError
                with pytest.raises((RateLimitError, APIError)) as exc_info:
                    await service.get_stock_price("AAPL")
                
                # Verify it's related to rate limiting
                assert "rate limit" in str(exc_info.value).lower() or "429" in str(exc_info.value)


class TestCoinGeckoService:
    """Test cases for CoinGecko service."""
    
    @pytest.fixture
    def service(self):
        return CoinGeckoService()
    
    @pytest.fixture
    def mock_coingecko_response(self):
        return {
            "bitcoin": {
                "usd": 45000.50,
                "last_updated_at": 1645123456
            }
        }
    
    @pytest.mark.asyncio
    async def test_get_crypto_price_success(self, service, mock_coingecko_response):
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = MagicMock()
            mock_response.json.return_value = mock_coingecko_response
            mock_response.raise_for_status = MagicMock()
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            price_data = await service.get_crypto_price("bitcoin")
            
            assert isinstance(price_data, PriceData)
            assert price_data.symbol == "BITCOIN"
            assert price_data.current_price == 45000.50
            assert price_data.source == "coingecko"
    
    @pytest.mark.asyncio
    async def test_get_crypto_price_symbol_mapping(self, service):
        # Custom mock response for BTC -> bitcoin mapping
        mock_response_data = {
            "bitcoin": {
                "usd": 45000.50,
                "last_updated_at": 1645123456
            }
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = MagicMock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status = MagicMock()
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            # Test that BTC maps to bitcoin but returns original symbol "BTC"
            price_data = await service.get_crypto_price("BTC")
            
            assert price_data.symbol == "BTC"  # Should return original symbol
            assert price_data.current_price == 45000.50
    
    @pytest.mark.asyncio
    async def test_get_crypto_price_not_found(self, service):
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {}  # Empty response
            mock_response.raise_for_status = MagicMock()
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            with pytest.raises(APIError) as exc_info:
                await service.get_crypto_price("invalidcoin")
            
            assert "No price data found" in str(exc_info.value)
    
    def test_normalize_symbol(self, service):
        # Test known symbol mappings
        assert service._normalize_symbol("BTC") == "bitcoin"
        assert service._normalize_symbol("ETH") == "ethereum"
        assert service._normalize_symbol("btc") == "bitcoin"
        
        # Test unknown symbol (should return as lowercase)
        assert service._normalize_symbol("UNKNOWN") == "unknown"


class TestPriceService:
    """Test cases for unified price service."""
    
    @pytest.fixture
    def service(self):
        return PriceService()
    
    @pytest.fixture
    def mock_stock_price(self):
        return PriceData(
            symbol="AAPL",
            current_price=150.25,
            timestamp=datetime.now(),
            source="alpha_vantage"
        )
    
    @pytest.fixture
    def mock_crypto_price(self):
        return PriceData(
            symbol="BTC",
            current_price=45000.50,
            timestamp=datetime.now(),
            source="coingecko"
        )
    
    @pytest.mark.asyncio
    async def test_get_price_explicit_stock(self, service, mock_stock_price):
        with patch.object(service.alpha_vantage, 'get_stock_price', return_value=mock_stock_price):
            price_data = await service.get_price("AAPL", AssetType.STOCK)
            
            assert price_data == mock_stock_price
            service.alpha_vantage.get_stock_price.assert_called_once_with("AAPL")
    
    @pytest.mark.asyncio
    async def test_get_price_explicit_crypto(self, service, mock_crypto_price):
        with patch.object(service.coingecko, 'get_crypto_price', return_value=mock_crypto_price):
            price_data = await service.get_price("BTC", AssetType.CRYPTO)
            
            assert price_data == mock_crypto_price
            service.coingecko.get_crypto_price.assert_called_once_with("BTC")
    
    @pytest.mark.asyncio
    async def test_get_price_auto_detect_stock(self, service, mock_stock_price):
        with patch.object(service.alpha_vantage, 'get_stock_price', return_value=mock_stock_price):
            # AAPL should be detected as stock (short, all caps, alphabetic)
            price_data = await service.get_price("AAPL", AssetType.AUTO)
            
            assert price_data == mock_stock_price
    
    @pytest.mark.asyncio
    async def test_get_price_auto_detect_crypto(self, service, mock_crypto_price):
        with patch.object(service.coingecko, 'get_crypto_price', return_value=mock_crypto_price):
            # BTC should be detected as crypto (known crypto symbol)
            price_data = await service.get_price("BTC", AssetType.AUTO)
            
            assert price_data == mock_crypto_price
    
    @pytest.mark.asyncio
    async def test_get_price_auto_detect_fallback(self, service, mock_crypto_price):
        # Test fallback when first attempt fails
        with patch.object(service.alpha_vantage, 'get_stock_price', side_effect=APIError("Not found", "alpha_vantage")):
            with patch.object(service.coingecko, 'get_crypto_price', return_value=mock_crypto_price):
                # UNKN might be tried as stock first, then crypto
                price_data = await service.get_price("UNKN", AssetType.AUTO)
                
                assert price_data == mock_crypto_price
    
    @pytest.mark.asyncio
    async def test_get_price_both_apis_fail(self, service):
        with patch.object(service.alpha_vantage, 'get_stock_price', side_effect=APIError("Stock not found", "alpha_vantage")):
            with patch.object(service.coingecko, 'get_crypto_price', side_effect=APIError("Crypto not found", "coingecko")):
                with pytest.raises(APIError):
                    await service.get_price("INVALID", AssetType.AUTO)
    
    def test_is_known_crypto_symbol(self, service):
        # Test known crypto symbols
        assert service._is_known_crypto_symbol("btc") == True
        assert service._is_known_crypto_symbol("ethereum") == True
        assert service._is_known_crypto_symbol("dogecoin") == True
        
        # Test unknown symbols
        assert service._is_known_crypto_symbol("aapl") == False
        assert service._is_known_crypto_symbol("unknown") == False


class TestPriceCache:
    """Test cases for price caching."""
    
    @pytest.mark.asyncio
    async def test_cache_stores_and_retrieves_data(self):
        from src.services.price_cache import PriceCache
        
        cache = PriceCache(ttl_seconds=60)
        
        price_data = PriceData(
            symbol="TEST",
            current_price=100.0,
            timestamp=datetime.now(),
            source="test"
        )
        
        # Store data
        await cache.set("TEST", "test_source", price_data)
        
        # Retrieve data
        cached_data = await cache.get("TEST", "test_source")
        
        assert cached_data is not None
        assert cached_data.symbol == "TEST"
        assert cached_data.current_price == 100.0
    
    @pytest.mark.asyncio
    async def test_cache_expiry(self):
        from src.services.price_cache import PriceCache
        import asyncio
        
        cache = PriceCache(ttl_seconds=0.1)  # Very short expiry
        
        price_data = PriceData(
            symbol="TEST",
            current_price=100.0,
            timestamp=datetime.now(),
            source="test"
        )
        
        await cache.set("TEST", "test_source", price_data)
        
        # Wait for expiry
        await asyncio.sleep(0.2)
        
        # Data should be expired
        cached_data = await cache.get("TEST", "test_source")
        assert cached_data is None