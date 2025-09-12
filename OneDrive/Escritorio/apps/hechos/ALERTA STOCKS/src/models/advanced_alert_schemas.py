"""
Pydantic schemas for Advanced Alerts (percentage change, technical indicators)
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal, Dict, Any
from datetime import datetime


class AdvancedAlertCreate(BaseModel):
    asset_symbol: str = Field(..., min_length=1, max_length=50)
    asset_type: Literal["stock", "crypto"]
    alert_type: Literal["percentage_change", "technical_indicator"]
    timeframe: Literal["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"] = "1d"
    conditions: Dict[str, Any] = Field(..., description="Alert-specific parameters")
    alert_name: Optional[str] = None
    description: Optional[str] = None

    @field_validator("asset_symbol")
    @classmethod
    def validate_symbol(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Asset symbol cannot be empty")
        return v


class AdvancedAlertUpdate(BaseModel):
    asset_symbol: Optional[str] = None
    asset_type: Optional[Literal["stock", "crypto"]] = None
    timeframe: Optional[Literal["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"]] = None
    conditions: Optional[Dict[str, Any]] = None
    alert_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    max_triggers: Optional[int] = None


class AdvancedAlertResponse(BaseModel):
    id: int
    asset_symbol: str
    asset_type: str
    alert_type: str
    timeframe: str
    conditions: Dict[str, Any]
    is_active: bool
    created_at: datetime
    last_triggered: Optional[datetime] = None
    last_checked: Optional[datetime] = None
    trigger_count: int
    alert_name: Optional[str] = None
    description: Optional[str] = None
    max_triggers: Optional[int] = None


class AdvancedAlertStats(BaseModel):
    total_alerts: int
    active_alerts: int
    triggered_today: int
    percentage_alerts: int
    technical_alerts: int

