"""
Advanced alert types for sophisticated monitoring
Percentage change alerts, technical indicators, volume-based alerts
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any

Base = declarative_base()


class AlertType(str, Enum):
    """Types of advanced alerts"""
    PRICE_THRESHOLD = "price_threshold"  # Basic price alerts (existing)
    PERCENTAGE_CHANGE = "percentage_change"  # Price change by percentage
    VOLUME_SPIKE = "volume_spike"  # Volume surge alerts
    TECHNICAL_INDICATOR = "technical_indicator"  # RSI, MACD, etc.
    PRICE_PATTERN = "price_pattern"  # Support/resistance breaks
    CORRELATION_ALERT = "correlation_alert"  # Cross-asset correlation
    NEWS_SENTIMENT = "news_sentiment"  # News-based alerts


class TimeFrame(str, Enum):
    """Time frames for alerts"""
    MINUTES_1 = "1m"
    MINUTES_5 = "5m"
    MINUTES_15 = "15m"
    MINUTES_30 = "30m"
    HOUR_1 = "1h"
    HOURS_4 = "4h"
    DAY_1 = "1d"
    WEEK_1 = "1w"
    MONTH_1 = "1M"


class TechnicalIndicator(str, Enum):
    """Supported technical indicators"""
    RSI = "rsi"  # Relative Strength Index
    MACD = "macd"  # Moving Average Convergence Divergence
    SMA = "sma"  # Simple Moving Average
    EMA = "ema"  # Exponential Moving Average
    BOLLINGER_BANDS = "bollinger"  # Bollinger Bands
    STOCHASTIC = "stochastic"  # Stochastic Oscillator
    VOLUME_AVERAGE = "volume_avg"  # Volume Moving Average


class AdvancedAlert(Base):
    """
    Advanced alert model supporting multiple alert types
    """
    __tablename__ = "advanced_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic alert info
    asset_symbol = Column(String(50), nullable=False, index=True)
    asset_type = Column(String(20), nullable=False)  # 'stock' or 'crypto'
    alert_type = Column(String(50), nullable=False, index=True)  # AlertType enum
    alert_name = Column(String(200), nullable=True)  # User-friendly name
    
    # Alert conditions (stored as JSON for flexibility)
    conditions = Column(JSON, nullable=False)  # Alert-specific parameters
    
    # Time frame and frequency
    timeframe = Column(String(10), nullable=False)  # TimeFrame enum
    check_frequency_minutes = Column(Integer, default=5)  # How often to check
    
    # Status and metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_triggered = Column(DateTime, nullable=True)
    last_checked = Column(DateTime, nullable=True)
    trigger_count = Column(Integer, default=0)
    
    # Notification settings
    notification_enabled = Column(Boolean, default=True)
    notification_channels = Column(JSON, nullable=True)  # ["whatsapp", "email", etc.]
    
    # Alert lifecycle
    max_triggers = Column(Integer, nullable=True)  # Auto-disable after N triggers
    expiry_date = Column(DateTime, nullable=True)  # Auto-expire alerts
    
    # Notes and description
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<AdvancedAlert(symbol='{self.asset_symbol}', type='{self.alert_type}', active={self.is_active})>"
    
    @property
    def is_expired(self) -> bool:
        """Check if alert has expired"""
        if self.expiry_date:
            return datetime.utcnow() > self.expiry_date
        return False
    
    @property
    def should_trigger(self) -> bool:
        """Check if alert should still trigger based on max_triggers"""
        if self.max_triggers:
            return self.trigger_count < self.max_triggers
        return True


class AlertTriggerHistory(Base):
    """
    History of alert triggers for analytics and debugging
    """
    __tablename__ = "alert_trigger_history"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, nullable=False, index=True)  # Reference to AdvancedAlert
    
    # Trigger details
    triggered_at = Column(DateTime, default=datetime.utcnow)
    trigger_price = Column(Float, nullable=True)
    trigger_value = Column(Float, nullable=True)  # The value that triggered (RSI, volume, etc.)
    trigger_conditions_met = Column(JSON, nullable=True)  # Which conditions were met
    
    # Market context at trigger time
    market_data_snapshot = Column(JSON, nullable=True)  # Price, volume, indicators at trigger
    
    # Notification details
    notification_sent = Column(Boolean, default=False)
    notification_channels_used = Column(JSON, nullable=True)
    notification_status = Column(String(50), nullable=True)  # "sent", "failed", "pending"
    
    def __repr__(self):
        return f"<AlertTriggerHistory(alert_id={self.alert_id}, triggered_at='{self.triggered_at}')>"


class AlertTemplate(Base):
    """
    Pre-configured alert templates for common scenarios
    """
    __tablename__ = "alert_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Template details
    template_name = Column(String(200), nullable=False, unique=True)
    template_description = Column(Text, nullable=True)
    alert_type = Column(String(50), nullable=False)
    category = Column(String(100), nullable=True)  # "breakout", "momentum", "mean_reversion", etc.
    
    # Template configuration
    default_conditions = Column(JSON, nullable=False)
    default_timeframe = Column(String(10), nullable=False)
    recommended_assets = Column(JSON, nullable=True)  # Asset types this works best with
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    usage_count = Column(Integer, default=0)
    success_rate = Column(Float, nullable=True)  # Optional performance tracking
    
    # Template settings
    is_active = Column(Boolean, default=True)
    difficulty_level = Column(String(20), default="beginner")  # "beginner", "intermediate", "advanced"
    
    def __repr__(self):
        return f"<AlertTemplate(name='{self.template_name}', type='{self.alert_type}')>"


# Example alert conditions schemas for different alert types:

# Percentage Change Alert:
# {
#   "change_percentage": 5.0,  # 5% change
#   "direction": "up",  # "up", "down", or "any"
#   "timeframe": "1d",
#   "comparison_base": "previous_close"  # "previous_close", "24h_ago", "1w_ago"
# }

# Technical Indicator Alert:
# {
#   "indicator": "rsi",
#   "operator": "crosses_above",  # "crosses_above", "crosses_below", "greater_than", "less_than"
#   "threshold": 70,
#   "period": 14,
#   "additional_params": {"smoothing": "sma"}
# }

# Volume Spike Alert:
# {
#   "volume_multiplier": 2.0,  # 2x average volume
#   "average_period": 20,  # 20-period average
#   "min_price_change": 0.01,  # Minimum price change to avoid false signals
#   "spike_duration": "1h"  # How long the spike should last
# }

# Price Pattern Alert:
# {
#   "pattern_type": "support_break",  # "support_break", "resistance_break", "triangle_breakout"
#   "pattern_strength": "strong",  # "weak", "medium", "strong"
#   "confirmation_candles": 2,  # Number of candles to confirm the break
#   "lookback_period": 50  # How many periods to look back for pattern
# }