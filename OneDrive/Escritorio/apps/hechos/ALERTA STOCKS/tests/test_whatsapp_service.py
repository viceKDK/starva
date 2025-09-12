import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime
from twilio.base.exceptions import TwilioException

from src.services.whatsapp_service import WhatsAppService, WhatsAppError, WhatsAppNotification
from src.models.price_data import PriceData


class TestWhatsAppService:
    """Test cases for WhatsApp service."""
    
    @pytest.fixture
    def service(self):
        """Create an unconfigured service for testing."""
        with patch('src.services.whatsapp_service.settings') as mock_settings:
            mock_settings.twilio_account_sid = ""
            mock_settings.twilio_auth_token = ""
            mock_settings.whatsapp_number = ""
            return WhatsAppService()
    
    @pytest.fixture
    def mock_price_data(self):
        return PriceData(
            symbol="AAPL",
            current_price=150.25,
            timestamp=datetime.now(),
            source="alpha_vantage"
        )
    
    @pytest.fixture
    def configured_service(self):
        """Create a service with mocked configuration."""
        with patch('src.services.whatsapp_service.settings') as mock_settings:
            mock_settings.twilio_account_sid = "test_sid"
            mock_settings.twilio_auth_token = "test_token"
            mock_settings.whatsapp_number = "+1234567890"
            
            with patch('src.services.whatsapp_service.Client') as mock_client:
                mock_client.return_value = MagicMock()
                service = WhatsAppService()
                return service
    
    def test_service_initialization_success(self):
        """Test successful service initialization with valid credentials."""
        with patch('src.services.whatsapp_service.settings') as mock_settings:
            mock_settings.twilio_account_sid = "test_sid"
            mock_settings.twilio_auth_token = "test_token"
            mock_settings.whatsapp_number = "+1234567890"
            
            with patch('src.services.whatsapp_service.Client') as mock_client:
                mock_client.return_value = MagicMock()
                
                service = WhatsAppService()
                
                assert service.account_sid == "test_sid"
                assert service.auth_token == "test_token"
                assert service.whatsapp_number == "+1234567890"
                assert service.client is not None
                mock_client.assert_called_once_with("test_sid", "test_token")
    
    def test_service_initialization_no_credentials(self):
        """Test service initialization with missing credentials."""
        with patch('src.services.whatsapp_service.settings') as mock_settings:
            mock_settings.twilio_account_sid = ""
            mock_settings.twilio_auth_token = ""
            mock_settings.whatsapp_number = ""
            
            service = WhatsAppService()
            
            assert service.client is None
            assert not service.is_configured()
    
    def test_service_initialization_client_error(self):
        """Test service initialization with Twilio client error."""
        with patch('src.services.whatsapp_service.settings') as mock_settings:
            mock_settings.twilio_account_sid = "test_sid"
            mock_settings.twilio_auth_token = "test_token"
            mock_settings.whatsapp_number = "+1234567890"
            
            with patch('src.services.whatsapp_service.Client') as mock_client:
                mock_client.side_effect = Exception("Authentication failed")
                
                with pytest.raises(WhatsAppError) as exc_info:
                    WhatsAppService()
                
                assert "Failed to initialize Twilio client" in str(exc_info.value)
    
    def test_is_configured_true(self, configured_service):
        """Test is_configured returns True when properly configured."""
        assert configured_service.is_configured() is True
    
    def test_is_configured_false(self, service):
        """Test is_configured returns False when not configured."""
        # Default service without mocked settings should not be configured
        assert service.is_configured() is False
    
    @pytest.mark.asyncio
    async def test_send_price_alert_success(self, configured_service, mock_price_data):
        """Test successful price alert sending."""
        mock_message = MagicMock()
        mock_message.sid = "test_message_id"
        mock_message.status = "sent"
        
        configured_service.client.messages.create.return_value = mock_message
        
        notification = await configured_service.send_price_alert(
            price_data=mock_price_data,
            condition=">= $150.00",
            target_price=150.0
        )
        
        assert isinstance(notification, WhatsAppNotification)
        assert notification.asset_symbol == "AAPL"
        assert notification.current_price == 150.25
        assert notification.condition == ">= $150.00"
        assert notification.target_price == 150.0
        assert notification.message_id == "test_message_id"
        assert notification.status == "sent"
        
        # Verify Twilio client was called
        configured_service.client.messages.create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_send_price_alert_not_configured(self, service, mock_price_data):
        """Test price alert fails when service not configured."""
        with pytest.raises(WhatsAppError) as exc_info:
            await service.send_price_alert(
                price_data=mock_price_data,
                condition=">= $150.00",
                target_price=150.0
            )
        
        assert "WhatsApp service not configured" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_send_price_alert_no_recipient(self):
        """Test price alert fails when no recipient configured."""
        with patch('src.services.whatsapp_service.settings') as mock_settings:
            mock_settings.twilio_account_sid = "test_sid"
            mock_settings.twilio_auth_token = "test_token"
            mock_settings.whatsapp_number = ""  # No recipient
            
            with patch('src.services.whatsapp_service.Client'):
                service = WhatsAppService()
                
                mock_price_data = PriceData(
                    symbol="AAPL",
                    current_price=150.25,
                    timestamp=datetime.now(),
                    source="alpha_vantage"
                )
                
                with pytest.raises(WhatsAppError) as exc_info:
                    await service.send_price_alert(
                        price_data=mock_price_data,
                        condition=">= $150.00",
                        target_price=150.0
                    )
                
                assert "No recipient number configured" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_send_price_alert_custom_recipient(self, configured_service, mock_price_data):
        """Test price alert with custom recipient number."""
        mock_message = MagicMock()
        mock_message.sid = "test_message_id"
        mock_message.status = "sent"
        
        configured_service.client.messages.create.return_value = mock_message
        
        custom_number = "+9876543210"
        notification = await configured_service.send_price_alert(
            price_data=mock_price_data,
            condition=">= $150.00",
            target_price=150.0,
            to_number=custom_number
        )
        
        assert notification.message_id == "test_message_id"
        
        # Verify the custom number was used
        call_args = configured_service.client.messages.create.call_args
        assert call_args[1]['to'] == f"whatsapp:{custom_number}"
    
    @pytest.mark.asyncio
    async def test_send_message_with_retry_success(self, configured_service):
        """Test successful message sending without retry."""
        mock_message = MagicMock()
        mock_message.sid = "test_id"
        mock_message.status = "sent"
        
        configured_service.client.messages.create.return_value = mock_message
        
        result = await configured_service._send_message_with_retry("test message", "+1234567890")
        
        assert result.sid == "test_id"
        assert result.status == "sent"
        
        # Should only be called once (no retry needed)
        configured_service.client.messages.create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_send_message_with_retry_success_after_retry(self, configured_service):
        """Test successful message sending after one retry."""
        mock_message = MagicMock()
        mock_message.sid = "test_id"
        mock_message.status = "sent"
        
        # Create a TwilioException with status attribute
        temp_error = TwilioException("Temporary error")
        temp_error.status = 500
        
        # First call fails, second succeeds
        configured_service.client.messages.create.side_effect = [
            temp_error,
            mock_message
        ]
        
        result = await configured_service._send_message_with_retry("test message", "+1234567890")
        
        assert result.sid == "test_id"
        assert result.status == "sent"
        
        # Should be called twice (original + retry)
        assert configured_service.client.messages.create.call_count == 2
    
    @pytest.mark.asyncio
    async def test_send_message_with_retry_non_retryable_error(self, configured_service):
        """Test non-retryable error (400 status) fails immediately."""
        bad_request_error = TwilioException("Bad request")
        bad_request_error.status = 400
        
        configured_service.client.messages.create.side_effect = bad_request_error
        
        with pytest.raises(WhatsAppError) as exc_info:
            await configured_service._send_message_with_retry("test message", "+1234567890")
        
        assert "WhatsApp message failed" in str(exc_info.value)
        
        # Should only be called once (no retry for 400 error)
        configured_service.client.messages.create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_send_message_with_retry_all_attempts_fail(self, configured_service):
        """Test all retry attempts fail."""
        service_error = TwilioException("Service unavailable")
        service_error.status = 503
        
        configured_service.client.messages.create.side_effect = service_error
        
        with pytest.raises(WhatsAppError) as exc_info:
            await configured_service._send_message_with_retry("test message", "+1234567890", max_retries=1)
        
        assert "WhatsApp message failed after 2 attempts" in str(exc_info.value)
        
        # Should be called twice (original + 1 retry)
        assert configured_service.client.messages.create.call_count == 2
    
    def test_format_price_alert_message_stock(self, configured_service):
        """Test message formatting for stock alerts."""
        price_data = PriceData(
            symbol="AAPL",
            current_price=150.25,
            timestamp=datetime(2023, 8, 28, 15, 30, 45),
            source="alpha_vantage"
        )
        
        message = configured_service._format_price_alert_message(
            price_data, ">= $150.00", 150.0
        )
        
        # Verify key components are in the message
        assert "📈 Stock" in message
        assert "AAPL" in message
        assert "$150.25" in message
        assert ">= $150.00" in message
        assert "15:30:45" in message
        assert "08/28/2023" in message
        assert "Price Alert Triggered" in message
    
    def test_format_price_alert_message_crypto(self, configured_service):
        """Test message formatting for crypto alerts."""
        price_data = PriceData(
            symbol="bitcoin",
            current_price=45000.12345,
            timestamp=datetime(2023, 8, 28, 15, 30, 45),
            source="coingecko"
        )
        
        message = configured_service._format_price_alert_message(
            price_data, ">= $45000.00", 45000.0
        )
        
        # Verify key components are in the message
        assert "🪙 Crypto" in message
        assert "bitcoin" in message
        assert "$45000.12" in message  # Should be rounded to 2 decimal places for large values
        assert ">= $45000.00" in message
    
    def test_format_price_alert_message_small_crypto_price(self, configured_service):
        """Test message formatting for crypto with small prices."""
        price_data = PriceData(
            symbol="SHIB",
            current_price=0.000012345,
            timestamp=datetime(2023, 8, 28, 15, 30, 45),
            source="coingecko"
        )
        
        message = configured_service._format_price_alert_message(
            price_data, ">= $0.000012", 0.000012
        )
        
        # Should show 6 decimal places for small values
        assert "$0.000012" in message
    
    @pytest.mark.asyncio
    async def test_send_test_message_success(self, configured_service):
        """Test successful test message sending."""
        mock_message = MagicMock()
        mock_message.sid = "test_message_id"
        mock_message.status = "sent"
        
        configured_service.client.messages.create.return_value = mock_message
        
        notification = await configured_service.send_test_message()
        
        assert notification.asset_symbol == "TEST"
        assert notification.message_id == "test_message_id"
        assert notification.status == "sent"
        assert "WhatsApp Integration Test" in configured_service.client.messages.create.call_args[1]['body']
    
    @pytest.mark.asyncio
    async def test_send_test_message_not_configured(self, service):
        """Test test message fails when service not configured."""
        with pytest.raises(WhatsAppError) as exc_info:
            await service.send_test_message()
        
        assert "WhatsApp service not configured" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_send_test_message_custom_recipient(self, configured_service):
        """Test test message with custom recipient."""
        mock_message = MagicMock()
        mock_message.sid = "test_message_id"
        mock_message.status = "sent"
        
        configured_service.client.messages.create.return_value = mock_message
        
        custom_number = "+9876543210"
        await configured_service.send_test_message(to_number=custom_number)
        
        # Verify the custom number was used
        call_args = configured_service.client.messages.create.call_args
        assert call_args[1]['to'] == f"whatsapp:{custom_number}"


class TestWhatsAppNotification:
    """Test cases for WhatsApp notification model."""
    
    def test_notification_creation(self):
        """Test WhatsApp notification object creation."""
        notification = WhatsAppNotification(
            asset_symbol="AAPL",
            current_price=150.25,
            condition=">= $150.00",
            target_price=150.0,
            message_id="test_id",
            sent_at=datetime.now(),
            status="sent"
        )
        
        assert notification.asset_symbol == "AAPL"
        assert notification.current_price == 150.25
        assert notification.condition == ">= $150.00"
        assert notification.target_price == 150.0
        assert notification.message_id == "test_id"
        assert notification.status == "sent"
    
    def test_notification_defaults(self):
        """Test WhatsApp notification with default values."""
        notification = WhatsAppNotification(
            asset_symbol="AAPL",
            current_price=150.25,
            condition=">= $150.00",
            target_price=150.0
        )
        
        assert notification.message_id is None
        assert notification.sent_at is None
        assert notification.status == "pending"


class TestWhatsAppError:
    """Test cases for WhatsApp error handling."""
    
    def test_whatsapp_error_basic(self):
        """Test basic WhatsApp error creation."""
        error = WhatsAppError("Test error message")
        
        assert str(error) == "Test error message"
        assert error.message == "Test error message"
        assert error.error_code is None
        assert error.original_error is None
    
    def test_whatsapp_error_with_details(self):
        """Test WhatsApp error with additional details."""
        original = Exception("Original error")
        error = WhatsAppError("Test error", error_code="E001", original_error=original)
        
        assert error.message == "Test error"
        assert error.error_code == "E001"
        assert error.original_error == original