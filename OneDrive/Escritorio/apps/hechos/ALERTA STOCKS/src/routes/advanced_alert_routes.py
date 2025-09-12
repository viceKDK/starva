"""
Routes for Advanced Alerts (percentage change, technical indicators)
"""

from fastapi import APIRouter, HTTPException, status
from typing import List
import logging

from src.models.advanced_alert_schemas import (
    AdvancedAlertCreate,
    AdvancedAlertUpdate,
    AdvancedAlertResponse,
    AdvancedAlertStats,
)
from src.services.advanced_alert_service import AdvancedAlertService


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/advanced-alerts", tags=["advanced-alerts"])


@router.post("/", response_model=AdvancedAlertResponse)
async def create_advanced_alert(payload: AdvancedAlertCreate):
    try:
        return await AdvancedAlertService.create_alert(payload)
    except Exception as e:
        logger.error(f"Failed to create advanced alert: {e}")
        raise HTTPException(status_code=500, detail="Failed to create advanced alert")


@router.get("/", response_model=List[AdvancedAlertResponse])
async def list_advanced_alerts():
    try:
        return await AdvancedAlertService.list_alerts()
    except Exception as e:
        logger.error(f"Failed to list advanced alerts: {e}")
        raise HTTPException(status_code=500, detail="Failed to list advanced alerts")


@router.get("/active", response_model=List[AdvancedAlertResponse])
async def list_active_advanced_alerts():
    try:
        return await AdvancedAlertService.list_alerts(active_only=True)
    except Exception as e:
        logger.error(f"Failed to list active advanced alerts: {e}")
        raise HTTPException(status_code=500, detail="Failed to list active advanced alerts")


@router.get("/{alert_id}", response_model=AdvancedAlertResponse)
async def get_advanced_alert(alert_id: int):
    alert = await AdvancedAlertService.get_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Advanced alert not found")
    return alert


@router.put("/{alert_id}", response_model=AdvancedAlertResponse)
async def update_advanced_alert(alert_id: int, payload: AdvancedAlertUpdate):
    updated = await AdvancedAlertService.update_alert(alert_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Advanced alert not found")
    return updated


@router.post("/{alert_id}/toggle", response_model=AdvancedAlertResponse)
async def toggle_advanced_alert(alert_id: int):
    updated = await AdvancedAlertService.toggle_alert(alert_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Advanced alert not found")
    return updated


@router.delete("/{alert_id}")
async def delete_advanced_alert(alert_id: int):
    deleted = await AdvancedAlertService.delete_alert(alert_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Advanced alert not found")
    return {"message": "Advanced alert deleted"}


@router.get("/stats/summary", response_model=AdvancedAlertStats)
async def get_advanced_alert_stats():
    try:
        return await AdvancedAlertService.stats()
    except Exception as e:
        logger.error(f"Failed to get advanced alert stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get advanced alert stats")

