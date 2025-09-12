"""
Portfolio management service
Handles portfolio operations, P&L calculations, and performance tracking
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, or_

from ..models.portfolio import PortfolioAsset, PortfolioTransaction, WatchlistAsset
from ..models.portfolio_schemas import (
    PortfolioAssetCreate, PortfolioAssetUpdate, PortfolioAssetResponse,
    TransactionCreate, TransactionResponse,
    WatchlistAssetCreate, WatchlistAssetUpdate, WatchlistAssetResponse,
    PortfolioStatsResponse, PortfolioDashboardResponse
)
from ..services.price_service_v2 import PriceServiceV2
from ..interfaces.price_provider import AssetType
from ..utils.database import get_db_connection
from ..utils.logging_config import get_logger

logger = get_logger(__name__)


class PortfolioService:
    """
    Service for portfolio management operations
    Follows Single Responsibility Principle - handles only portfolio business logic
    """
    
    def __init__(self, price_service: PriceServiceV2):
        self.price_service = price_service
    
    async def add_position(self, position_data: PortfolioAssetCreate) -> PortfolioAssetResponse:
        """
        Add a new position to portfolio or update existing one
        """
        try:
            conn = await get_db_connection()
            
            # Check if asset already exists in portfolio
            query = """
                SELECT id, quantity, total_invested, average_cost
                FROM portfolio_assets 
                WHERE asset_symbol = ? AND is_active = 1
            """
            cursor = await conn.execute(query, (position_data.asset_symbol,))
            existing_position = await cursor.fetchone()
            
            total_cost = (position_data.quantity * position_data.price_per_unit) + position_data.fees
            
            if existing_position:
                # Update existing position
                old_quantity = existing_position[1]
                old_total_invested = existing_position[2]
                
                new_quantity = old_quantity + position_data.quantity
                new_total_invested = old_total_invested + total_cost
                new_average_cost = new_total_invested / new_quantity if new_quantity > 0 else 0
                
                update_query = """
                    UPDATE portfolio_assets 
                    SET quantity = ?, total_invested = ?, average_cost = ?, 
                        asset_name = COALESCE(?, asset_name), notes = COALESCE(?, notes),
                        last_updated = ?
                    WHERE id = ?
                """
                await conn.execute(update_query, (
                    new_quantity, new_total_invested, new_average_cost,
                    position_data.asset_name, position_data.notes,
                    datetime.utcnow(), existing_position[0]
                ))
                
                position_id = existing_position[0]
            else:
                # Create new position
                average_cost = position_data.price_per_unit + (position_data.fees / position_data.quantity)
                
                insert_query = """
                    INSERT INTO portfolio_assets 
                    (asset_symbol, asset_type, asset_name, quantity, average_cost, total_invested, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """
                cursor = await conn.execute(insert_query, (
                    position_data.asset_symbol,
                    position_data.asset_type.value,
                    position_data.asset_name,
                    position_data.quantity,
                    average_cost,
                    total_cost,
                    position_data.notes
                ))
                position_id = cursor.lastrowid
            
            # Record transaction
            transaction_query = """
                INSERT INTO portfolio_transactions 
                (portfolio_asset_id, transaction_type, quantity, price_per_unit, total_amount, fees)
                VALUES (?, ?, ?, ?, ?, ?)
            """
            await conn.execute(transaction_query, (
                position_id, 'buy', position_data.quantity, 
                position_data.price_per_unit, total_cost, position_data.fees
            ))
            
            await conn.commit()
            
            logger.info("Position added successfully", extra={
                'extra_context': {
                    'symbol': position_data.asset_symbol,
                    'quantity': position_data.quantity,
                    'operation': 'add_position'
                }
            })
            
            return await self.get_position_by_id(position_id)
            
        except Exception as e:
            logger.error("Failed to add position", exc_info=e, extra={
                'extra_context': {
                    'symbol': position_data.asset_symbol,
                    'operation': 'add_position'
                }
            })
            raise
    
    async def get_position_by_id(self, position_id: int) -> Optional[PortfolioAssetResponse]:
        """Get portfolio position by ID with current market data"""
        try:
            conn = await get_db_connection()
            
            query = """
                SELECT id, asset_symbol, asset_type, asset_name, quantity, 
                       average_cost, total_invested, first_purchase_date, 
                       last_updated, is_active, notes
                FROM portfolio_assets 
                WHERE id = ?
            """
            cursor = await conn.execute(query, (position_id,))
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            # Get current price
            current_price = await self._get_current_price(row[1], row[2])  # symbol, asset_type
            current_value = row[4] * current_price if current_price else 0  # quantity * price
            profit_loss = current_value - row[6] if current_price else 0  # current_value - total_invested
            profit_loss_percentage = (profit_loss / row[6] * 100) if row[6] > 0 else 0
            
            return PortfolioAssetResponse(
                id=row[0],
                asset_symbol=row[1],
                asset_type=row[2],
                asset_name=row[3],
                quantity=row[4],
                average_cost=row[5],
                total_invested=row[6],
                first_purchase_date=row[7],
                last_updated=row[8],
                is_active=row[9],
                notes=row[10],
                current_price=current_price,
                current_value=current_value,
                profit_loss=profit_loss,
                profit_loss_percentage=profit_loss_percentage
            )
            
        except Exception as e:
            logger.error("Failed to get position", exc_info=e, extra={
                'extra_context': {'position_id': position_id}
            })
            raise
    
    async def get_all_positions(self, include_inactive: bool = False) -> List[PortfolioAssetResponse]:
        """Get all portfolio positions with current market data"""
        try:
            conn = await get_db_connection()
            
            where_clause = "" if include_inactive else "WHERE is_active = 1"
            query = f"""
                SELECT id, asset_symbol, asset_type, asset_name, quantity, 
                       average_cost, total_invested, first_purchase_date, 
                       last_updated, is_active, notes
                FROM portfolio_assets 
                {where_clause}
                ORDER BY total_invested DESC
            """
            cursor = await conn.execute(query)
            rows = await cursor.fetchall()
            
            positions = []
            for row in rows:
                # Get current price for each position
                current_price = await self._get_current_price(row[1], row[2])
                current_value = row[4] * current_price if current_price else 0
                profit_loss = current_value - row[6] if current_price else 0
                profit_loss_percentage = (profit_loss / row[6] * 100) if row[6] > 0 else 0
                
                position = PortfolioAssetResponse(
                    id=row[0],
                    asset_symbol=row[1],
                    asset_type=row[2],
                    asset_name=row[3],
                    quantity=row[4],
                    average_cost=row[5],
                    total_invested=row[6],
                    first_purchase_date=row[7],
                    last_updated=row[8],
                    is_active=row[9],
                    notes=row[10],
                    current_price=current_price,
                    current_value=current_value,
                    profit_loss=profit_loss,
                    profit_loss_percentage=profit_loss_percentage
                )
                positions.append(position)
            
            return positions
            
        except Exception as e:
            logger.error("Failed to get positions", exc_info=e)
            raise
    
    async def get_portfolio_stats(self) -> PortfolioStatsResponse:
        """Calculate comprehensive portfolio statistics"""
        try:
            positions = await self.get_all_positions()
            
            total_invested = sum(pos.total_invested for pos in positions)
            total_current_value = sum(pos.current_value or 0 for pos in positions)
            total_profit_loss = total_current_value - total_invested
            total_profit_loss_percentage = (total_profit_loss / total_invested * 100) if total_invested > 0 else 0
            
            # Asset type breakdown
            stocks = [pos for pos in positions if pos.asset_type == 'stock']
            crypto = [pos for pos in positions if pos.asset_type == 'crypto']
            
            total_stocks_value = sum(pos.current_value or 0 for pos in stocks)
            total_crypto_value = sum(pos.current_value or 0 for pos in crypto)
            
            stocks_percentage = (total_stocks_value / total_current_value * 100) if total_current_value > 0 else 0
            crypto_percentage = (total_crypto_value / total_current_value * 100) if total_current_value > 0 else 0
            
            # Best/worst performers
            profitable_positions = [pos for pos in positions if pos.profit_loss and pos.profit_loss > 0]
            losing_positions = [pos for pos in positions if pos.profit_loss and pos.profit_loss < 0]
            
            best_performer = None
            worst_performer = None
            
            if profitable_positions:
                best = max(profitable_positions, key=lambda x: x.profit_loss_percentage or 0)
                best_performer = {
                    "symbol": best.asset_symbol,
                    "gain": best.profit_loss_percentage
                }
            
            if losing_positions:
                worst = min(losing_positions, key=lambda x: x.profit_loss_percentage or 0)
                worst_performer = {
                    "symbol": worst.asset_symbol,
                    "loss": worst.profit_loss_percentage
                }
            
            return PortfolioStatsResponse(
                total_invested=total_invested,
                total_current_value=total_current_value,
                total_profit_loss=total_profit_loss,
                total_profit_loss_percentage=total_profit_loss_percentage,
                total_stocks_value=total_stocks_value,
                total_crypto_value=total_crypto_value,
                number_of_positions=len(positions),
                best_performer=best_performer,
                worst_performer=worst_performer,
                stocks_percentage=stocks_percentage,
                crypto_percentage=crypto_percentage,
                last_updated=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error("Failed to get portfolio stats", exc_info=e)
            raise
    
    async def sell_position(self, position_id: int, quantity: float, price_per_unit: float, 
                           fees: float = 0.0) -> PortfolioAssetResponse:
        """Sell part or all of a position"""
        try:
            conn = await get_db_connection()
            
            # Get current position
            position = await self.get_position_by_id(position_id)
            if not position:
                raise ValueError("Position not found")
            
            if quantity > position.quantity:
                raise ValueError("Cannot sell more than owned quantity")
            
            # Calculate new position values
            remaining_quantity = position.quantity - quantity
            total_sale_amount = (quantity * price_per_unit) - fees
            
            if remaining_quantity <= 0:
                # Selling entire position - mark as inactive
                update_query = """
                    UPDATE portfolio_assets 
                    SET quantity = 0, is_active = 0, last_updated = ?
                    WHERE id = ?
                """
                await conn.execute(update_query, (datetime.utcnow(), position_id))
            else:
                # Partial sale - update quantities
                # Keep the same average cost, just reduce quantity and total invested proportionally
                new_total_invested = position.total_invested * (remaining_quantity / position.quantity)
                
                update_query = """
                    UPDATE portfolio_assets 
                    SET quantity = ?, total_invested = ?, last_updated = ?
                    WHERE id = ?
                """
                await conn.execute(update_query, (
                    remaining_quantity, new_total_invested, datetime.utcnow(), position_id
                ))
            
            # Record sell transaction
            transaction_query = """
                INSERT INTO portfolio_transactions 
                (portfolio_asset_id, transaction_type, quantity, price_per_unit, total_amount, fees)
                VALUES (?, ?, ?, ?, ?, ?)
            """
            await conn.execute(transaction_query, (
                position_id, 'sell', quantity, price_per_unit, total_sale_amount, fees
            ))
            
            await conn.commit()
            
            logger.info("Position sold successfully", extra={
                'extra_context': {
                    'symbol': position.asset_symbol,
                    'quantity_sold': quantity,
                    'sale_amount': total_sale_amount,
                    'operation': 'sell_position'
                }
            })
            
            return await self.get_position_by_id(position_id)
            
        except Exception as e:
            logger.error("Failed to sell position", exc_info=e, extra={
                'extra_context': {'position_id': position_id, 'operation': 'sell_position'}
            })
            raise
    
    async def _get_current_price(self, symbol: str, asset_type: str) -> Optional[float]:
        """Get current price for an asset"""
        try:
            asset_type_enum = AssetType.STOCK if asset_type == 'stock' else AssetType.CRYPTO
            price_data = await self.price_service.get_price(symbol, asset_type_enum)
            return price_data.current_price
        except Exception as e:
            logger.warning(f"Failed to get current price for {symbol}: {e}")
            return None