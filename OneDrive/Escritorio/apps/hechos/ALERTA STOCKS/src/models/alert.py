"""
Alert database model
SQLAlchemy ORM model for price alerts
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, CheckConstraint, Index
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional

Base = declarative_base()


class Alert(Base):
    """
    Alert model for storing price monitoring configurations
    """
    __tablename__ = "alerts"
    
    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Asset information
    asset_symbol = Column(String(20), nullable=False, doc="Stock ticker or crypto symbol")
    asset_type = Column(String(10), nullable=False, doc="Asset type: 'stock' or 'crypto'")
    
    # Alert conditions
    condition_type = Column(String(2), nullable=False, doc="Condition: '>=' or '<='")
    threshold_price = Column(Float, nullable=False, doc="Price threshold for triggering alert")
    
    # Status and tracking
    is_active = Column(Boolean, nullable=False, default=True, doc="Whether alert is currently active")
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=func.now(), doc="When alert was created")
    last_triggered = Column(DateTime, nullable=True, doc="Last time alert was triggered")
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "asset_type IN ('stock', 'crypto')", 
            name='check_asset_type'
        ),
        CheckConstraint(
            "condition_type IN ('>=', '<=')", 
            name='check_condition_type'
        ),
        CheckConstraint(
            "threshold_price > 0", 
            name='check_positive_price'
        ),
        # Indexes for performance
        Index('idx_alerts_active', 'is_active'),
        Index('idx_alerts_asset_symbol', 'asset_symbol'),
        Index('idx_alerts_last_triggered', 'last_triggered'),
        Index('idx_alerts_asset_type', 'asset_type'),
    )
    
    def __repr__(self) -> str:
        return (
            f"<Alert(id={self.id}, "
            f"asset_symbol='{self.asset_symbol}', "
            f"asset_type='{self.asset_type}', "
            f"condition='{self.condition_type}', "
            f"threshold={self.threshold_price}, "
            f"active={self.is_active})>"
        )
    
    def __str__(self) -> str:
        status = "Active" if self.is_active else "Inactive"
        return (
            f"{self.asset_symbol} ({self.asset_type}) "
            f"{self.condition_type} ${self.threshold_price:.2f} [{status}]"
        )
    
    @property
    def is_in_cooldown(self) -> bool:
        """Check if alert is currently in cooldown period"""
        if not self.last_triggered:
            return False
        
        from src.config.settings import get_settings
        settings = get_settings()
        
        # Calculate cooldown period
        cooldown_hours = settings.cooldown_hours
        from datetime import timezone
        now = datetime.now(timezone.utc)
        
        # Ensure last_triggered is a datetime object
        last_triggered = self.last_triggered
        if isinstance(last_triggered, str):
            # Parse ISO format string to datetime
            try:
                last_triggered = datetime.fromisoformat(last_triggered.replace('Z', '+00:00'))
            except ValueError:
                # If parsing fails, assume it's not in cooldown
                return False
        elif not isinstance(last_triggered, datetime):
            return False
            
        # Make sure both datetimes are timezone-aware for comparison
        if last_triggered.tzinfo is None:
            last_triggered = last_triggered.replace(tzinfo=timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
            
        time_since_trigger = now - last_triggered
        
        return time_since_trigger.total_seconds() < (cooldown_hours * 3600)
    
    @property
    def can_trigger(self) -> bool:
        """Check if alert can be triggered (active and not in cooldown)"""
        return self.is_active and not self.is_in_cooldown
    
    def to_dict(self) -> dict:
        """Convert alert to dictionary representation"""
        return {
            'id': self.id,
            'asset_symbol': self.asset_symbol,
            'asset_type': self.asset_type,
            'condition_type': self.condition_type,
            'threshold_price': self.threshold_price,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_triggered': self.last_triggered.isoformat() if self.last_triggered else None,
            'is_in_cooldown': self.is_in_cooldown,
            'can_trigger': self.can_trigger
        }