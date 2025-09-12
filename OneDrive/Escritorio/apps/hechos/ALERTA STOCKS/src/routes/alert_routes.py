"""
Alert management routes
"""

from fastapi import APIRouter, HTTPException, status, Form
from fastapi.responses import JSONResponse
from typing import List
import logging

from src.models.schemas import AlertCreate, AlertUpdate, AlertResponse, AlertStats
from src.services.alert_service import AlertService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("/", response_model=AlertResponse)
async def create_alert(
    asset_symbol: str = Form(...),
    asset_type: str = Form(...),
    condition_type: str = Form(...),
    threshold_price: float = Form(...)
):
    """
    Create a new price alert
    """
    try:
        alert_data = AlertCreate(
            asset_symbol=asset_symbol,
            asset_type=asset_type,
            condition_type=condition_type,
            threshold_price=threshold_price
        )
        
        result = await AlertService.create_alert(alert_data)
        logger.info(f"Created new alert: {result.id}")
        
        return result
        
    except ValueError as e:
        logger.warning(f"Validation error creating alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create alert"
        )


@router.get("/", response_model=List[AlertResponse])
async def get_all_alerts():
    """
    Get all price alerts
    """
    try:
        alerts = await AlertService.get_all_alerts()
        return alerts
    except Exception as e:
        logger.error(f"Error retrieving alerts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve alerts"
        )


@router.get("/active", response_model=List[AlertResponse])
async def get_active_alerts():
    """
    Get only active price alerts
    """
    try:
        alerts = await AlertService.get_active_alerts()
        return alerts
    except Exception as e:
        logger.error(f"Error retrieving active alerts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve active alerts"
        )


@router.get("/stats", response_model=AlertStats)
async def get_alert_stats():
    """
    Get alert statistics
    """
    try:
        stats = await AlertService.get_alert_stats()
        return stats
    except Exception as e:
        logger.error(f"Error retrieving alert stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve alert statistics"
        )


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(alert_id: int):
    """
    Get a specific alert by ID
    """
    try:
        alert = await AlertService.get_alert_by_id(alert_id)
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        return alert
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving alert {alert_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve alert"
        )


@router.put("/{alert_id}", response_model=AlertResponse)
async def update_alert(alert_id: int, alert_update: AlertUpdate):
    """
    Update an existing alert
    """
    try:
        updated_alert = await AlertService.update_alert(alert_id, alert_update)
        if not updated_alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        logger.info(f"Updated alert: {alert_id}")
        return updated_alert
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Validation error updating alert {alert_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating alert {alert_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update alert"
        )


@router.post("/{alert_id}/toggle", response_model=AlertResponse)
async def toggle_alert_status(alert_id: int):
    """
    Toggle alert active status
    """
    try:
        updated_alert = await AlertService.toggle_alert_status(alert_id)
        if not updated_alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        status_text = "activated" if updated_alert.is_active else "deactivated"
        logger.info(f"Alert {alert_id} {status_text}")
        
        return updated_alert
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling alert {alert_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to toggle alert status"
        )


@router.delete("/{alert_id}")
async def delete_alert(alert_id: int):
    """
    Delete an alert
    """
    try:
        deleted = await AlertService.delete_alert(alert_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        logger.info(f"Deleted alert: {alert_id}")
        return JSONResponse(
            content={"message": "Alert deleted successfully"},
            status_code=status.HTTP_200_OK
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting alert {alert_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete alert"
        )