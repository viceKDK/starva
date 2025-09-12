"""
Pydantic schemas for data validation
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime
from decimal import Decimal


class AlertCreate(BaseModel):
    """Schema for creating new alerts"""
    
    asset_symbol: str = Field(
        ..., 
        min_length=1, 
        max_length=20,
        description="Stock ticker symbol (e.g. AAPL) or cryptocurrency name (e.g. bitcoin)",
        example="AAPL"
    )
    
    asset_type: Literal["stock", "crypto"] = Field(
        ...,
        description="Type of asset being monitored",
        example="stock"
    )
    
    condition_type: Literal[">=", "<="] = Field(
        ...,
        description="Price condition for triggering alert",
        example=">="
    )
    
    threshold_price: float = Field(
        ...,
        gt=0,
        description="Price threshold that triggers the alert",
        example=150.00
    )
    
    @field_validator('asset_symbol')
    @classmethod
    def validate_asset_symbol(cls, v):
        """Validate asset symbol format"""
        v = v.strip().upper() if v else v
        
        if not v:
            raise ValueError('Asset symbol cannot be empty')
        
        # Remove any special characters except for common ones
        allowed_chars = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-_')
        if not all(c in allowed_chars for c in v):
            raise ValueError('Asset symbol contains invalid characters')
        
        return v
    
    @field_validator('threshold_price')
    @classmethod
    def validate_threshold_price(cls, v):
        """Validate threshold price"""
        if v <= 0:
            raise ValueError('Threshold price must be positive')
        
        if v > 1000000:  # Reasonable upper limit
            raise ValueError('Threshold price too high (max: $1,000,000)')
        
        # Round to 8 decimal places for precision
        return round(float(v), 8)
    
    class Config:
        """Pydantic configuration"""
        schema_extra = {
            "example": {
                "asset_symbol": "AAPL",
                "asset_type": "stock",
                "condition_type": ">=",
                "threshold_price": 150.00
            }
        }


class AlertUpdate(BaseModel):
    """Schema for updating existing alerts"""
    
    asset_symbol: Optional[str] = Field(
        None, 
        min_length=1, 
        max_length=20,
        description="Stock ticker symbol or cryptocurrency name"
    )
    
    asset_type: Optional[Literal["stock", "crypto"]] = Field(
        None,
        description="Type of asset being monitored"
    )
    
    condition_type: Optional[Literal[">=", "<="]] = Field(
        None,
        description="Price condition for triggering alert"
    )
    
    threshold_price: Optional[float] = Field(
        None,
        gt=0,
        description="Price threshold that triggers the alert"
    )
    
    is_active: Optional[bool] = Field(
        None,
        description="Whether the alert is currently active"
    )
    
    @field_validator('asset_symbol')
    @classmethod
    def validate_asset_symbol(cls, v):
        """Validate asset symbol format if provided"""
        if v is not None:
            v = v.strip().upper()
            if not v:
                raise ValueError('Asset symbol cannot be empty')
            
            allowed_chars = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-_')
            if not all(c in allowed_chars for c in v):
                raise ValueError('Asset symbol contains invalid characters')
        
        return v
    
    @field_validator('threshold_price')
    @classmethod
    def validate_threshold_price(cls, v):
        """Validate threshold price if provided"""
        if v is not None:
            if v <= 0:
                raise ValueError('Threshold price must be positive')
            
            if v > 1000000:
                raise ValueError('Threshold price too high (max: $1,000,000)')
            
            return round(float(v), 8)
        
        return v


class AlertResponse(BaseModel):
    """Schema for alert API responses"""
    
    id: int = Field(..., description="Unique alert identifier")
    asset_symbol: str = Field(..., description="Asset symbol being monitored")
    asset_type: str = Field(..., description="Type of asset (stock/crypto)")
    condition_type: str = Field(..., description="Price condition (>=/<= )")
    threshold_price: float = Field(..., description="Price threshold for alert")
    is_active: bool = Field(..., description="Whether alert is currently active")
    created_at: datetime = Field(..., description="When alert was created")
    last_triggered: Optional[datetime] = Field(None, description="Last time alert was triggered")
    is_in_cooldown: bool = Field(..., description="Whether alert is in cooldown period")
    can_trigger: bool = Field(..., description="Whether alert can currently be triggered")
    
    class Config:
        """Pydantic configuration"""
        from_attributes = True  # Enable ORM mode for SQLAlchemy models
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
        schema_extra = {
            "example": {
                "id": 1,
                "asset_symbol": "AAPL",
                "asset_type": "stock", 
                "condition_type": ">=",
                "threshold_price": 150.00,
                "is_active": True,
                "created_at": "2025-08-28T00:00:00",
                "last_triggered": None,
                "is_in_cooldown": False,
                "can_trigger": True
            }
        }


class AlertToggle(BaseModel):
    """Schema for toggling alert active status"""
    
    is_active: bool = Field(..., description="New active status for the alert")
    
    class Config:
        schema_extra = {
            "example": {
                "is_active": False
            }
        }


class AlertStats(BaseModel):
    """Schema for alert statistics"""
    
    total_alerts: int = Field(..., description="Total number of alerts")
    active_alerts: int = Field(..., description="Number of active alerts")
    inactive_alerts: int = Field(..., description="Number of inactive alerts")
    stock_alerts: int = Field(..., description="Number of stock alerts")
    crypto_alerts: int = Field(..., description="Number of crypto alerts")
    alerts_in_cooldown: int = Field(..., description="Number of alerts in cooldown")
    
    class Config:
        schema_extra = {
            "example": {
                "total_alerts": 5,
                "active_alerts": 3,
                "inactive_alerts": 2,
                "stock_alerts": 3,
                "crypto_alerts": 2,
                "alerts_in_cooldown": 1
            }
        }