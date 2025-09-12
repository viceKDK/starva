"""
Application settings configuration
"""

from pydantic_settings import BaseSettings
from pydantic import Field, ConfigDict
from functools import lru_cache
import os
from pathlib import Path


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application Configuration
    host: str = Field(default="127.0.0.1", description="Server host")
    port: int = Field(default=8000, description="Server port")
    debug: bool = Field(default=True, description="Debug mode")
    log_level: str = Field(default="INFO", description="Logging level")
    
    # Database Configuration
    database_path: str = Field(default="data/alerts.db", description="SQLite database path")
    
    # External API Configuration
    ALPHA_VANTAGE_API_KEY: str = Field(default="", description="Alpha Vantage API key")
    coingecko_api_enabled: bool = Field(default=True, description="Enable CoinGecko API")
    
    # WhatsApp/Twilio Configuration
    twilio_account_sid: str = Field(default="", description="Twilio Account SID")
    twilio_auth_token: str = Field(default="", description="Twilio Auth Token")
    twilio_from_number: str = Field(default="", description="Twilio FROM number for WhatsApp")
    whatsapp_number: str = Field(default="", description="WhatsApp number for notifications")
    
    # Monitoring Configuration
    monitoring_interval_minutes: int = Field(default=5, description="Price check interval in minutes")
    cooldown_hours: float = Field(default=0.02, description="Alert cooldown period in hours")
    
    # Notification Configuration
    enable_whatsapp: bool = Field(default=True, description="Enable WhatsApp notifications")
    
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=False
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()


def ensure_directories():
    """Ensure required directories exist"""
    settings = get_settings()
    
    # Create database directory
    db_dir = Path(settings.database_path).parent
    db_dir.mkdir(parents=True, exist_ok=True)
    
    # Create logs directory
    logs_dir = Path("logs")
    logs_dir.mkdir(parents=True, exist_ok=True)
    
    # Create data directory
    data_dir = Path("data")
    data_dir.mkdir(parents=True, exist_ok=True)