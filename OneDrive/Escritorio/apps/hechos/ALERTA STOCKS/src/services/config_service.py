"""
Configuration management service
Handles dynamic configuration updates and validation
"""

import os
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path
from pydantic import BaseModel, Field, ValidationError

from src.config.settings import get_settings, Settings
from src.services.monitoring_scheduler import monitoring_scheduler


logger = logging.getLogger(__name__)


class ConfigSetting(BaseModel):
    """Model for a configuration setting"""
    key: str
    value: Any
    description: str
    category: str
    hot_reloadable: bool = False
    sensitive: bool = False
    validation_type: str = "str"  # str, int, float, bool
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    valid_options: Optional[List[str]] = None


class ConfigUpdateRequest(BaseModel):
    """Request model for updating configuration"""
    settings: Dict[str, Any]


class ConfigService:
    """
    Service for managing application configuration
    """
    
    def __init__(self):
        self.settings = get_settings()
        self._config_definitions = self._define_config_structure()
        
    def _define_config_structure(self) -> Dict[str, ConfigSetting]:
        """Define the structure and metadata for all configuration settings"""
        return {
            # Application Settings
            "monitoring_interval_minutes": ConfigSetting(
                key="monitoring_interval_minutes",
                value=self.settings.monitoring_interval_minutes,
                description="Price check interval in minutes",
                category="Monitoring",
                hot_reloadable=True,
                validation_type="int",
                min_value=1,
                max_value=60
            ),
            "cooldown_hours": ConfigSetting(
                key="cooldown_hours", 
                value=self.settings.cooldown_hours,
                description="Alert cooldown period in hours",
                category="Monitoring",
                hot_reloadable=True,
                validation_type="int",
                min_value=1,
                max_value=168
            ),
            "enable_whatsapp": ConfigSetting(
                key="enable_whatsapp",
                value=self.settings.enable_whatsapp,
                description="Enable WhatsApp notifications",
                category="Notifications",
                hot_reloadable=True,
                validation_type="bool"
            ),
            "log_level": ConfigSetting(
                key="log_level",
                value=self.settings.log_level,
                description="Application logging level",
                category="Application",
                hot_reloadable=True,
                validation_type="str",
                valid_options=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
            ),
            "debug": ConfigSetting(
                key="debug",
                value=self.settings.debug,
                description="Debug mode (requires restart)",
                category="Application",
                hot_reloadable=False,
                validation_type="bool"
            ),
            "coingecko_api_enabled": ConfigSetting(
                key="coingecko_api_enabled",
                value=self.settings.coingecko_api_enabled,
                description="Enable CoinGecko API for crypto prices",
                category="External APIs",
                hot_reloadable=True,
                validation_type="bool"
            ),
            # Sensitive settings (display-only, not editable via web)
            "twilio_account_sid": ConfigSetting(
                key="twilio_account_sid",
                value="***HIDDEN***" if self.settings.twilio_account_sid else "Not Set",
                description="Twilio Account SID",
                category="External APIs",
                hot_reloadable=False,
                sensitive=True,
                validation_type="str"
            ),
            "alpha_vantage_api_key": ConfigSetting(
                key="ALPHA_VANTAGE_API_KEY",
                value="***HIDDEN***" if self.settings.ALPHA_VANTAGE_API_KEY else "Not Set",
                description="Alpha Vantage API Key",
                category="External APIs",
                hot_reloadable=False,
                sensitive=True,
                validation_type="str"
            ),
            "whatsapp_number": ConfigSetting(
                key="whatsapp_number",
                value="***HIDDEN***" if self.settings.whatsapp_number else "Not Set",
                description="WhatsApp notification number",
                category="Notifications",
                hot_reloadable=False,
                sensitive=True,
                validation_type="str"
            ),
        }
    
    def get_all_settings(self) -> Dict[str, Dict[str, Any]]:
        """Get all configuration settings organized by category"""
        config = {}
        
        for setting_key, setting_def in self._config_definitions.items():
            category = setting_def.category
            if category not in config:
                config[category] = {}
                
            config[category][setting_key] = {
                "value": setting_def.value,
                "description": setting_def.description,
                "hot_reloadable": setting_def.hot_reloadable,
                "sensitive": setting_def.sensitive,
                "validation_type": setting_def.validation_type,
                "min_value": setting_def.min_value,
                "max_value": setting_def.max_value,
                "valid_options": setting_def.valid_options
            }
            
        return config
    
    def get_editable_settings(self) -> Dict[str, Dict[str, Any]]:
        """Get only non-sensitive settings that can be edited via web interface"""
        config = {}
        
        for setting_key, setting_def in self._config_definitions.items():
            if setting_def.sensitive:
                continue
                
            category = setting_def.category
            if category not in config:
                config[category] = {}
                
            config[category][setting_key] = {
                "value": setting_def.value,
                "description": setting_def.description,
                "hot_reloadable": setting_def.hot_reloadable,
                "validation_type": setting_def.validation_type,
                "min_value": setting_def.min_value,
                "max_value": setting_def.max_value,
                "valid_options": setting_def.valid_options
            }
            
        return config
    
    def validate_setting(self, key: str, value: Any) -> tuple[bool, str, Any]:
        """
        Validate a configuration setting value
        
        Returns:
            (is_valid, error_message, converted_value)
        """
        if key not in self._config_definitions:
            return False, f"Unknown setting: {key}", None
            
        setting_def = self._config_definitions[key]
        
        # Convert value based on type
        try:
            if setting_def.validation_type == "int":
                converted_value = int(value)
                if setting_def.min_value is not None and converted_value < setting_def.min_value:
                    return False, f"Value must be at least {setting_def.min_value}", None
                if setting_def.max_value is not None and converted_value > setting_def.max_value:
                    return False, f"Value must be at most {setting_def.max_value}", None
                    
            elif setting_def.validation_type == "float":
                converted_value = float(value)
                if setting_def.min_value is not None and converted_value < setting_def.min_value:
                    return False, f"Value must be at least {setting_def.min_value}", None
                if setting_def.max_value is not None and converted_value > setting_def.max_value:
                    return False, f"Value must be at most {setting_def.max_value}", None
                    
            elif setting_def.validation_type == "bool":
                if isinstance(value, str):
                    converted_value = value.lower() in ("true", "1", "yes", "on")
                else:
                    converted_value = bool(value)
                    
            elif setting_def.validation_type == "str":
                converted_value = str(value)
                if setting_def.valid_options and converted_value not in setting_def.valid_options:
                    return False, f"Value must be one of: {', '.join(setting_def.valid_options)}", None
                    
            else:
                converted_value = value
                
        except (ValueError, TypeError) as e:
            return False, f"Invalid {setting_def.validation_type} value: {e}", None
            
        return True, "", converted_value
    
    async def update_setting(self, key: str, value: Any) -> tuple[bool, str]:
        """
        Update a single configuration setting
        
        Returns:
            (success, message)
        """
        # Validate the setting
        is_valid, error_msg, converted_value = self.validate_setting(key, value)
        if not is_valid:
            return False, error_msg
            
        setting_def = self._config_definitions[key]
        
        # Check if setting is editable
        if setting_def.sensitive:
            return False, "This setting cannot be updated via web interface for security reasons"
        
        try:
            # Update the setting in our settings object
            if hasattr(self.settings, key):
                setattr(self.settings, key, converted_value)
                
            # Update our config definition
            setting_def.value = converted_value
            
            # Handle hot-reloadable settings
            if setting_def.hot_reloadable:
                await self._apply_hot_reload(key, converted_value)
                
            logger.info(f"Configuration setting '{key}' updated to '{converted_value}'")
            return True, f"Setting '{key}' updated successfully"
            
        except Exception as e:
            logger.error(f"Failed to update setting '{key}': {e}")
            return False, f"Failed to update setting: {e}"
    
    async def update_multiple_settings(self, settings_dict: Dict[str, Any]) -> Dict[str, tuple[bool, str]]:
        """
        Update multiple configuration settings
        
        Returns:
            Dict with results for each setting
        """
        results = {}
        
        for key, value in settings_dict.items():
            success, message = await self.update_setting(key, value)
            results[key] = (success, message)
            
        return results
    
    async def _apply_hot_reload(self, key: str, value: Any):
        """Apply hot-reload changes for specific settings"""
        try:
            if key == "monitoring_interval_minutes":
                # Update scheduler interval
                if monitoring_scheduler.scheduler and monitoring_scheduler.scheduler.running:
                    await monitoring_scheduler.update_interval(value)
                    
            elif key == "log_level":
                # Update logging level
                logging.getLogger().setLevel(getattr(logging, value.upper()))
                logger.info(f"Log level changed to {value}")
                
            elif key in ["enable_whatsapp", "coingecko_api_enabled", "cooldown_hours"]:
                # These settings are read dynamically from settings object
                logger.info(f"Setting '{key}' will take effect on next use")
                
        except Exception as e:
            logger.error(f"Error applying hot-reload for setting '{key}': {e}")
    
    def get_restart_required_settings(self) -> List[str]:
        """Get list of settings that require application restart"""
        return [
            key for key, setting_def in self._config_definitions.items() 
            if not setting_def.hot_reloadable and not setting_def.sensitive
        ]
    
    def validate_configuration_health(self) -> Dict[str, Any]:
        """Validate current configuration and return health status"""
        issues = []
        warnings = []
        
        # Check for missing API keys
        if not self.settings.ALPHA_VANTAGE_API_KEY or self.settings.ALPHA_VANTAGE_API_KEY == "your_alpha_vantage_key_here":
            issues.append("Alpha Vantage API key not configured - stock price monitoring will not work")
            
        if not self.settings.twilio_account_sid or self.settings.twilio_account_sid == "your_twilio_account_sid_here":
            issues.append("Twilio Account SID not configured - WhatsApp notifications will not work")
            
        if not self.settings.twilio_auth_token or self.settings.twilio_auth_token == "your_twilio_auth_token_here":
            issues.append("Twilio Auth Token not configured - WhatsApp notifications will not work")
            
        # Check for reasonable settings
        if self.settings.monitoring_interval_minutes < 5:
            warnings.append("Very frequent monitoring may exceed API rate limits")
            
        if self.settings.cooldown_hours < 1:
            warnings.append("Short cooldown period may result in spam notifications")
            
        return {
            "healthy": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "total_issues": len(issues),
            "total_warnings": len(warnings)
        }


# Global service instance
config_service = ConfigService()