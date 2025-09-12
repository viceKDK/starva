"""
Portfolio models for tracking investments without user authentication
Single-user portfolio management
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from typing import Optional

Base = declarative_base()


class PortfolioAsset(Base):
    """
    Model for tracking individual asset positions in portfolio
    """
    __tablename__ = "portfolio_assets"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_symbol = Column(String(50), nullable=False, index=True)
    asset_type = Column(String(20), nullable=False)  # 'stock' or 'crypto'
    asset_name = Column(String(200))  # Full name of the asset
    
    # Position details
    quantity = Column(Float, nullable=False, default=0.0)
    average_cost = Column(Float, nullable=False, default=0.0)  # Average cost per unit
    total_invested = Column(Float, nullable=False, default=0.0)  # Total amount invested
    
    # Metadata
    first_purchase_date = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<PortfolioAsset(symbol='{self.asset_symbol}', quantity={self.quantity}, avg_cost={self.average_cost})>"
    
    @property
    def current_value(self):
        """Calculate current value based on quantity and current market price"""
        # This will be calculated dynamically using current price data
        return 0.0
    
    @property
    def profit_loss(self):
        """Calculate profit/loss for this position"""
        return self.current_value - self.total_invested
    
    @property
    def profit_loss_percentage(self):
        """Calculate profit/loss percentage"""
        if self.total_invested == 0:
            return 0.0
        return (self.profit_loss / self.total_invested) * 100


class PortfolioTransaction(Base):
    """
    Model for tracking buy/sell transactions
    """
    __tablename__ = "portfolio_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_asset_id = Column(Integer, nullable=False, index=True)  # Reference to PortfolioAsset
    
    # Transaction details
    transaction_type = Column(String(10), nullable=False)  # 'buy' or 'sell'
    quantity = Column(Float, nullable=False)
    price_per_unit = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    
    # Fees and costs
    fees = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    
    # Metadata
    transaction_date = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<PortfolioTransaction(type='{self.transaction_type}', quantity={self.quantity}, price={self.price_per_unit})>"


class PortfolioSummary(Base):
    """
    Model for storing portfolio summary snapshots for performance tracking
    """
    __tablename__ = "portfolio_summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Portfolio totals
    total_invested = Column(Float, nullable=False, default=0.0)
    total_current_value = Column(Float, nullable=False, default=0.0)
    total_profit_loss = Column(Float, nullable=False, default=0.0)
    total_profit_loss_percentage = Column(Float, nullable=False, default=0.0)
    
    # Asset breakdown
    total_stocks_value = Column(Float, default=0.0)
    total_crypto_value = Column(Float, default=0.0)
    number_of_positions = Column(Integer, default=0)
    
    # Performance metrics
    best_performer_symbol = Column(String(50), nullable=True)
    best_performer_gain = Column(Float, nullable=True)
    worst_performer_symbol = Column(String(50), nullable=True)
    worst_performer_loss = Column(Float, nullable=True)
    
    # Metadata
    snapshot_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<PortfolioSummary(total_value={self.total_current_value}, profit_loss={self.total_profit_loss})>"


class WatchlistAsset(Base):
    """
    Model for tracking assets in watchlist (not owned, just monitoring)
    """
    __tablename__ = "watchlist_assets"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_symbol = Column(String(50), nullable=False, unique=True, index=True)
    asset_type = Column(String(20), nullable=False)
    asset_name = Column(String(200))
    
    # Monitoring preferences
    target_buy_price = Column(Float, nullable=True)  # Price at which user wants to buy
    target_sell_price = Column(Float, nullable=True)  # Price at which user wants to sell
    
    # Metadata
    added_date = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<WatchlistAsset(symbol='{self.asset_symbol}', target_buy={self.target_buy_price})>"