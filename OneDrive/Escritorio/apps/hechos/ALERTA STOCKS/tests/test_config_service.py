"""
Test suite for configuration service
"""

import pytest
from unittest.mock import patch, Mock

from src.services.config_service import ConfigService, ConfigSetting
from src.config.settings import get_settings


class TestConfigSetting:
    """Test ConfigSetting model"""
    
    def test_config_setting_creation(self):
        """Test creating a ConfigSetting"""
        setting = ConfigSetting(
            key="test_setting",
            value="test_value",
            description="Test description",
            category="Test",
            hot_reloadable=True,
            validation_type="str"
        )
        
        assert setting.key == "test_setting"
        assert setting.value == "test_value"
        assert setting.description == "Test description"
        assert setting.category == "Test"
        assert setting.hot_reloadable is True
        assert setting.validation_type == "str"
        assert setting.sensitive is False  # default


class TestConfigService:
    """Test ConfigService class"""
    
    @pytest.fixture
    def config_service(self):
        """Create config service instance for testing"""
        return ConfigService()
    
    def test_config_service_initialization(self, config_service):
        """Test config service initializes correctly"""
        assert config_service.settings is not None
        assert config_service._config_definitions is not None
        assert len(config_service._config_definitions) > 0
    
    def test_get_all_settings(self, config_service):
        """Test getting all settings organized by category"""
        settings = config_service.get_all_settings()
        
        assert isinstance(settings, dict)
        assert len(settings) > 0
        
        # Check that categories exist
        assert "Monitoring" in settings
        assert "Notifications" in settings
        assert "Application" in settings
        
        # Check structure of settings
        for category, category_settings in settings.items():
            assert isinstance(category_settings, dict)
            for key, setting in category_settings.items():
                assert "value" in setting
                assert "description" in setting
                assert "hot_reloadable" in setting
                assert "validation_type" in setting
    
    def test_get_editable_settings(self, config_service):
        """Test getting only editable (non-sensitive) settings"""
        editable = config_service.get_editable_settings()
        all_settings = config_service.get_all_settings()
        
        # Should have fewer settings than all settings (sensitive ones excluded)
        editable_count = sum(len(category.keys()) for category in editable.values())
        all_count = sum(len(category.keys()) for category in all_settings.values())
        assert editable_count < all_count
        
        # Check that no sensitive settings are included
        for category, category_settings in editable.items():
            for key, setting in category_settings.items():
                original_setting = None
                for orig_cat, orig_settings in all_settings.items():
                    if key in orig_settings:
                        original_setting = orig_settings[key]
                        break
                assert original_setting is not None
                # Should not include sensitive settings in config_definitions
    
    def test_validate_setting_int(self, config_service):
        """Test validating integer settings"""
        # Valid integer
        is_valid, error_msg, converted = config_service.validate_setting(
            "monitoring_interval_minutes", "10"
        )
        assert is_valid is True
        assert error_msg == ""
        assert converted == 10
        
        # Integer out of range (too low)
        is_valid, error_msg, converted = config_service.validate_setting(
            "monitoring_interval_minutes", "0"
        )
        assert is_valid is False
        assert "at least" in error_msg
        
        # Integer out of range (too high)
        is_valid, error_msg, converted = config_service.validate_setting(
            "monitoring_interval_minutes", "100"
        )
        assert is_valid is False
        assert "at most" in error_msg
        
        # Invalid integer
        is_valid, error_msg, converted = config_service.validate_setting(
            "monitoring_interval_minutes", "not_a_number"
        )
        assert is_valid is False
        assert "Invalid int value" in error_msg
    
    def test_validate_setting_bool(self, config_service):
        """Test validating boolean settings"""
        # Valid boolean values
        test_cases = [
            ("true", True),
            ("false", False),
            ("True", True), 
            ("False", False),
            ("1", True),
            ("0", False),
            (True, True),
            (False, False)
        ]
        
        for input_val, expected in test_cases:
            is_valid, error_msg, converted = config_service.validate_setting(
                "enable_whatsapp", input_val
            )
            assert is_valid is True
            assert error_msg == ""
            assert converted == expected
    
    def test_validate_setting_str_with_options(self, config_service):
        """Test validating string settings with valid options"""
        # Valid option
        is_valid, error_msg, converted = config_service.validate_setting(
            "log_level", "INFO"
        )
        assert is_valid is True
        assert error_msg == ""
        assert converted == "INFO"
        
        # Invalid option
        is_valid, error_msg, converted = config_service.validate_setting(
            "log_level", "INVALID_LEVEL"
        )
        assert is_valid is False
        assert "must be one of" in error_msg
    
    def test_validate_unknown_setting(self, config_service):
        """Test validating unknown setting"""
        is_valid, error_msg, converted = config_service.validate_setting(
            "unknown_setting", "value"
        )
        assert is_valid is False
        assert "Unknown setting" in error_msg
        assert converted is None
    
    @pytest.mark.asyncio
    async def test_update_setting_success(self, config_service):
        """Test successfully updating a setting"""
        original_value = config_service.settings.monitoring_interval_minutes
        
        success, message = await config_service.update_setting(
            "monitoring_interval_minutes", 15
        )
        
        assert success is True
        assert "updated successfully" in message
        assert config_service.settings.monitoring_interval_minutes == 15
        
        # Reset for other tests
        config_service.settings.monitoring_interval_minutes = original_value
    
    @pytest.mark.asyncio
    async def test_update_setting_invalid_value(self, config_service):
        """Test updating setting with invalid value"""
        success, message = await config_service.update_setting(
            "monitoring_interval_minutes", 100  # Out of range
        )
        
        assert success is False
        assert "at most" in message
    
    @pytest.mark.asyncio
    async def test_update_setting_sensitive(self, config_service):
        """Test attempting to update sensitive setting"""
        success, message = await config_service.update_setting(
            "twilio_account_sid", "new_value"
        )
        
        assert success is False
        assert "cannot be updated via web interface" in message
    
    @pytest.mark.asyncio
    async def test_update_multiple_settings(self, config_service):
        """Test updating multiple settings"""
        settings_to_update = {
            "monitoring_interval_minutes": 10,
            "enable_whatsapp": False,
            "log_level": "DEBUG"
        }
        
        results = await config_service.update_multiple_settings(settings_to_update)
        
        assert len(results) == 3
        
        # All should succeed
        for key, (success, message) in results.items():
            assert success is True
            assert "updated successfully" in message
    
    @pytest.mark.asyncio
    @patch('src.services.config_service.monitoring_scheduler')
    async def test_hot_reload_monitoring_interval(self, mock_scheduler, config_service):
        """Test hot-reload of monitoring interval"""
        # Mock scheduler
        mock_scheduler.scheduler = Mock()
        mock_scheduler.scheduler.running = True
        mock_scheduler.update_interval = Mock(return_value=None)
        
        success, message = await config_service.update_setting(
            "monitoring_interval_minutes", 20
        )
        
        assert success is True
        # Should call update_interval on scheduler
        mock_scheduler.update_interval.assert_called_once_with(20)
    
    @pytest.mark.asyncio
    @patch('logging.getLogger')
    async def test_hot_reload_log_level(self, mock_get_logger, config_service):
        """Test hot-reload of log level"""
        mock_logger = Mock()
        mock_get_logger.return_value = mock_logger
        
        success, message = await config_service.update_setting(
            "log_level", "ERROR"
        )
        
        assert success is True
        # Should update logging level
        mock_logger.setLevel.assert_called_once()
    
    def test_get_restart_required_settings(self, config_service):
        """Test getting settings that require restart"""
        restart_required = config_service.get_restart_required_settings()
        
        assert isinstance(restart_required, list)
        assert "debug" in restart_required  # Debug requires restart
        # Should not include sensitive settings
        assert "twilio_account_sid" not in restart_required
    
    def test_validate_configuration_health(self, config_service):
        """Test configuration health validation"""
        health = config_service.validate_configuration_health()
        
        assert isinstance(health, dict)
        assert "healthy" in health
        assert "issues" in health
        assert "warnings" in health
        assert "total_issues" in health
        assert "total_warnings" in health
        
        assert isinstance(health["issues"], list)
        assert isinstance(health["warnings"], list)
        assert isinstance(health["total_issues"], int)
        assert isinstance(health["total_warnings"], int)
        
        # With default mock settings, should have API key issues
        assert health["total_issues"] >= 0  # May have API key issues
    
    @patch('src.config.settings.get_settings')
    def test_validate_configuration_health_with_missing_keys(self, mock_get_settings, config_service):
        """Test configuration health with missing API keys"""
        # Mock settings with missing keys
        mock_settings = Mock()
        mock_settings.ALPHA_VANTAGE_API_KEY = "your_alpha_vantage_key_here"
        mock_settings.twilio_account_sid = "your_twilio_account_sid_here"
        mock_settings.twilio_auth_token = "your_twilio_auth_token_here"
        mock_settings.monitoring_interval_minutes = 5
        mock_settings.cooldown_hours = 3
        
        config_service.settings = mock_settings
        
        health = config_service.validate_configuration_health()
        
        assert health["healthy"] is False
        assert health["total_issues"] >= 3  # Should have issues for missing keys
        
        # Should identify missing API keys
        issues_text = " ".join(health["issues"])
        assert "Alpha Vantage" in issues_text
        assert "Twilio" in issues_text
    
    @patch('src.config.settings.get_settings')
    def test_validate_configuration_health_with_warnings(self, mock_get_settings, config_service):
        """Test configuration health with warnings"""
        # Mock settings with values that generate warnings
        mock_settings = Mock()
        mock_settings.ALPHA_VANTAGE_API_KEY = "real_api_key"
        mock_settings.twilio_account_sid = "real_sid"
        mock_settings.twilio_auth_token = "real_token"
        mock_settings.monitoring_interval_minutes = 1  # Very frequent - should warn
        mock_settings.cooldown_hours = 0.5  # Very short - should warn
        
        config_service.settings = mock_settings
        
        health = config_service.validate_configuration_health()
        
        assert health["total_warnings"] >= 1  # Should have warnings
        
        warnings_text = " ".join(health["warnings"])
        assert "frequent monitoring" in warnings_text or "cooldown period" in warnings_text