"""
Portfolio management API routes
RESTful endpoints for portfolio operations
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging

from ..services.portfolio_service import PortfolioService
from ..services.price_service_v2 import PriceServiceV2
from ..models.portfolio_schemas import (
    PortfolioAssetCreate, PortfolioAssetUpdate, PortfolioAssetResponse,
    TransactionCreate, TransactionResponse,
    PortfolioStatsResponse, PortfolioDashboardResponse
)
from ..di.container import get_service
from ..utils.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/portfolio", tags=["portfolio"])


def get_portfolio_service() -> PortfolioService:
    """Dependency injection for PortfolioService"""
    price_service = get_service(PriceServiceV2)
    return PortfolioService(price_service)


@router.post("/positions", response_model=PortfolioAssetResponse)
async def add_position(
    position_data: PortfolioAssetCreate,
    portfolio_service: PortfolioService = Depends(get_portfolio_service)
):
    """
    Add a new position to the portfolio or update existing one
    """
    try:
        position = await portfolio_service.add_position(position_data)
        logger.info("Position added via API", extra={
            'extra_context': {
                'symbol': position_data.asset_symbol,
                'quantity': position_data.quantity,
                'endpoint': '/portfolio/positions'
            }
        })
        return position
    except ValueError as e:
        logger.warning("Invalid position data", extra={
            'extra_context': {'error': str(e), 'symbol': position_data.asset_symbol}
        })
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Failed to add position", exc_info=e)
        raise HTTPException(status_code=500, detail="Failed to add position")


@router.get("/positions", response_model=List[PortfolioAssetResponse])
async def get_positions(
    include_inactive: bool = Query(False, description="Include inactive positions"),
    portfolio_service: PortfolioService = Depends(get_portfolio_service)
):
    """
    Get all portfolio positions with current market data
    """
    try:
        positions = await portfolio_service.get_all_positions(include_inactive)
        return positions
    except Exception as e:
        logger.error("Failed to get positions", exc_info=e)
        raise HTTPException(status_code=500, detail="Failed to retrieve positions")


@router.get("/positions/{position_id}", response_model=PortfolioAssetResponse)
async def get_position(
    position_id: int,
    portfolio_service: PortfolioService = Depends(get_portfolio_service)
):
    """
    Get a specific portfolio position by ID
    """
    try:
        position = await portfolio_service.get_position_by_id(position_id)
        if not position:
            raise HTTPException(status_code=404, detail="Position not found")
        return position
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get position", exc_info=e, extra={
            'extra_context': {'position_id': position_id}
        })
        raise HTTPException(status_code=500, detail="Failed to retrieve position")


@router.put("/positions/{position_id}", response_model=PortfolioAssetResponse)
async def update_position(
    position_id: int,
    update_data: PortfolioAssetUpdate,
    portfolio_service: PortfolioService = Depends(get_portfolio_service)
):
    """
    Update portfolio position metadata
    """
    try:
        # For now, we'll implement a basic update method
        # This would need to be added to PortfolioService
        raise HTTPException(status_code=501, detail="Position update not implemented yet")
    except Exception as e:
        logger.error("Failed to update position", exc_info=e)
        raise HTTPException(status_code=500, detail="Failed to update position")


@router.post("/positions/{position_id}/sell", response_model=PortfolioAssetResponse)
async def sell_position(
    position_id: int,
    quantity: float = Query(..., gt=0, description="Quantity to sell"),
    price_per_unit: float = Query(..., gt=0, description="Sell price per unit"),
    fees: float = Query(0.0, ge=0, description="Transaction fees"),
    portfolio_service: PortfolioService = Depends(get_portfolio_service)
):
    """
    Sell part or all of a position
    """
    try:
        position = await portfolio_service.sell_position(
            position_id, quantity, price_per_unit, fees
        )
        logger.info("Position sold via API", extra={
            'extra_context': {
                'position_id': position_id,
                'quantity': quantity,
                'price': price_per_unit,
                'endpoint': '/portfolio/positions/sell'
            }
        })
        return position
    except ValueError as e:
        logger.warning("Invalid sell request", extra={
            'extra_context': {'error': str(e), 'position_id': position_id}
        })
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Failed to sell position", exc_info=e)
        raise HTTPException(status_code=500, detail="Failed to sell position")


@router.get("/stats", response_model=PortfolioStatsResponse)
async def get_portfolio_stats(
    portfolio_service: PortfolioService = Depends(get_portfolio_service)
):
    """
    Get comprehensive portfolio statistics and performance metrics
    """
    try:
        stats = await portfolio_service.get_portfolio_stats()
        return stats
    except Exception as e:
        logger.error("Failed to get portfolio stats", exc_info=e)
        raise HTTPException(status_code=500, detail="Failed to retrieve portfolio statistics")


@router.get("/dashboard", response_model=dict)
async def get_portfolio_dashboard(
    portfolio_service: PortfolioService = Depends(get_portfolio_service)
):
    """
    Get comprehensive dashboard data including stats, recent transactions, and top positions
    """
    try:
        # Get portfolio stats
        stats = await portfolio_service.get_portfolio_stats()
        
        # Get top positions (limit to 5)
        all_positions = await portfolio_service.get_all_positions()
        top_positions = sorted(
            all_positions, 
            key=lambda x: x.current_value or 0, 
            reverse=True
        )[:5]
        
        # For now, return basic dashboard data
        # Recent transactions would require additional implementation
        dashboard_data = {
            "stats": stats,
            "top_positions": top_positions,
            "recent_transactions": [],  # Placeholder
            "performance_chart_data": [],  # Placeholder for chart data
            "asset_allocation": {
                "stocks_percentage": stats.stocks_percentage,
                "crypto_percentage": stats.crypto_percentage
            }
        }
        
        return dashboard_data
        
    except Exception as e:
        logger.error("Failed to get dashboard data", exc_info=e)
        raise HTTPException(status_code=500, detail="Failed to retrieve dashboard data")


@router.delete("/positions/{position_id}")
async def delete_position(
    position_id: int,
    portfolio_service: PortfolioService = Depends(get_portfolio_service)
):
    """
    Delete a position from portfolio (mark as inactive)
    """
    try:
        # This would need to be implemented in PortfolioService
        raise HTTPException(status_code=501, detail="Position deletion not implemented yet")
    except Exception as e:
        logger.error("Failed to delete position", exc_info=e)
        raise HTTPException(status_code=500, detail="Failed to delete position")


# Health check for portfolio service
@router.get("/health")
async def portfolio_health_check():
    """
    Health check endpoint for portfolio service
    """
    try:
        return {
            "status": "healthy",
            "service": "portfolio",
            "timestamp": "2024-01-01T00:00:00Z",
            "features": [
                "add_positions",
                "get_positions", 
                "sell_positions",
                "portfolio_stats",
                "dashboard_data"
            ]
        }
    except Exception as e:
        logger.error("Portfolio health check failed", exc_info=e)
        raise HTTPException(status_code=503, detail="Portfolio service unavailable")