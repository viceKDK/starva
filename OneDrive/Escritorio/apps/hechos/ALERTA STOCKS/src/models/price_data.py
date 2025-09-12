from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class PriceData(BaseModel):
    """Standardized price data model for all API responses."""
    
    symbol: str = Field(..., description="Asset symbol (e.g., 'AAPL', 'bitcoin')")
    current_price: float = Field(..., gt=0, description="Current price in USD")
    timestamp: datetime = Field(..., description="Timestamp when price was fetched")
    source: str = Field(..., description="API source (alpha_vantage, coingecko)")
    
    model_config = ConfigDict(
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )


class APIError(Exception):
    """Custom exception for API-related errors."""
    
    def __init__(self, message: str, source: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.source = source
        self.status_code = status_code


class RateLimitError(APIError):
    """Exception for rate limit exceeded errors."""
    
    def __init__(self, message: str, source: str, retry_after: Optional[int] = None):
        super().__init__(message, source)
        self.retry_after = retry_after