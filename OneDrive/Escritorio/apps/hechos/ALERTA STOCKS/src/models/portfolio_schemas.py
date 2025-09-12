"""
Pydantic schemas for portfolio management
"""

from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List
from enum import Enum


class TransactionType(str, Enum):
    BUY = "buy"
    SELL = "sell"


class AssetType(str, Enum):
    STOCK = "stock"
    CRYPTO = "crypto"


# Portfolio Asset Schemas
class PortfolioAssetBase(BaseModel):
    asset_symbol: str = Field(..., min_length=1, max_length=50)
    asset_type: AssetType
    asset_name: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None


class PortfolioAssetCreate(PortfolioAssetBase):
    quantity: float = Field(..., gt=0)
    price_per_unit: float = Field(..., gt=0)
    fees: Optional[float] = Field(0.0, ge=0)
    
    @validator('asset_symbol')
    def validate_symbol(cls, v):
        return v.upper().strip()


class PortfolioAssetUpdate(BaseModel):
    asset_name: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class PortfolioAssetResponse(PortfolioAssetBase):
    id: int
    quantity: float
    average_cost: float
    total_invested: float
    current_price: Optional[float] = None
    current_value: Optional[float] = None
    profit_loss: Optional[float] = None
    profit_loss_percentage: Optional[float] = None
    first_purchase_date: datetime
    last_updated: datetime
    is_active: bool
    
    class Config:
        from_attributes = True


# Transaction Schemas
class TransactionBase(BaseModel):
    transaction_type: TransactionType
    quantity: float = Field(..., gt=0)
    price_per_unit: float = Field(..., gt=0)
    fees: Optional[float] = Field(0.0, ge=0)
    tax: Optional[float] = Field(0.0, ge=0)
    transaction_date: Optional[datetime] = None
    notes: Optional[str] = None


class TransactionCreate(TransactionBase):
    portfolio_asset_id: int = Field(..., gt=0)
    
    @validator('transaction_date', pre=True, always=True)
    def set_transaction_date(cls, v):
        return v or datetime.utcnow()


class TransactionResponse(TransactionBase):
    id: int
    portfolio_asset_id: int
    total_amount: float
    transaction_date: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


# Watchlist Schemas
class WatchlistAssetBase(BaseModel):
    asset_symbol: str = Field(..., min_length=1, max_length=50)
    asset_type: AssetType
    asset_name: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None


class WatchlistAssetCreate(WatchlistAssetBase):
    target_buy_price: Optional[float] = Field(None, gt=0)
    target_sell_price: Optional[float] = Field(None, gt=0)
    
    @validator('asset_symbol')
    def validate_symbol(cls, v):
        return v.upper().strip()


class WatchlistAssetUpdate(BaseModel):
    asset_name: Optional[str] = None
    target_buy_price: Optional[float] = Field(None, gt=0)
    target_sell_price: Optional[float] = Field(None, gt=0)
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class WatchlistAssetResponse(WatchlistAssetBase):
    id: int
    target_buy_price: Optional[float]
    target_sell_price: Optional[float]
    current_price: Optional[float] = None
    price_change_24h: Optional[float] = None
    added_date: datetime
    last_updated: datetime
    is_active: bool
    
    class Config:
        from_attributes = True


# Portfolio Summary Schemas
class PortfolioStatsResponse(BaseModel):
    total_invested: float
    total_current_value: float
    total_profit_loss: float
    total_profit_loss_percentage: float
    total_stocks_value: float
    total_crypto_value: float
    number_of_positions: int
    
    # Top performers
    best_performer: Optional[dict] = None  # {"symbol": "AAPL", "gain": 15.5}
    worst_performer: Optional[dict] = None  # {"symbol": "TSLA", "loss": -8.2}
    
    # Asset allocation
    stocks_percentage: float = 0.0
    crypto_percentage: float = 0.0
    
    last_updated: datetime


class PortfolioDashboardResponse(BaseModel):
    stats: PortfolioStatsResponse
    recent_transactions: List[TransactionResponse]
    top_positions: List[PortfolioAssetResponse]
    watchlist: List[WatchlistAssetResponse]


# Chart Data Schemas
class PortfolioChartDataPoint(BaseModel):
    date: datetime
    value: float
    profit_loss: float


class PortfolioChartResponse(BaseModel):
    period: str  # "1d", "1w", "1m", "3m", "1y", "all"
    data_points: List[PortfolioChartDataPoint]
    
    
# Asset Search Schemas
class AssetSearchResult(BaseModel):
    symbol: str
    name: str
    type: AssetType
    current_price: Optional[float] = None
    market_cap: Optional[float] = None
    volume_24h: Optional[float] = None


class AssetSearchResponse(BaseModel):
    query: str
    results: List[AssetSearchResult]
    total_results: int