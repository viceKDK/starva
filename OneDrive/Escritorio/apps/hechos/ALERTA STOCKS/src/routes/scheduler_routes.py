"""
Scheduler management API routes
"""

import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from src.services.monitoring_scheduler import monitoring_scheduler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scheduler", tags=["Scheduler"])


class IntervalUpdateRequest(BaseModel):
    """Request model for updating monitoring interval"""
    minutes: int = Field(..., ge=1, le=60, description="Monitoring interval in minutes (1-60)")


@router.get("/status", response_model=Dict[str, Any])
async def get_scheduler_status():
    """
    Get current scheduler status and statistics.
    
    Returns:
        Dict containing scheduler status, statistics, and configuration
    """
    try:
        status = monitoring_scheduler.get_status()
        return JSONResponse(content=status)
        
    except Exception as e:
        logger.error(f"Failed to get scheduler status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/start")
async def start_scheduler():
    """
    Start the price monitoring scheduler.
    
    Returns:
        Success message or error details
    """
    try:
        await monitoring_scheduler.start()
        return {"message": "Scheduler started successfully", "success": True}
        
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop")
async def stop_scheduler():
    """
    Stop the price monitoring scheduler.
    
    Returns:
        Success message or error details
    """
    try:
        await monitoring_scheduler.stop()
        return {"message": "Scheduler stopped successfully", "success": True}
        
    except Exception as e:
        logger.error(f"Failed to stop scheduler: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/restart")
async def restart_scheduler():
    """
    Restart the price monitoring scheduler.
    
    Returns:
        Success message or error details
    """
    try:
        await monitoring_scheduler.restart()
        return {"message": "Scheduler restarted successfully", "success": True}
        
    except Exception as e:
        logger.error(f"Failed to restart scheduler: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check")
async def trigger_manual_check():
    """
    Manually trigger a price monitoring check.
    
    Returns:
        Results of the manual check including statistics
    """
    try:
        result = await monitoring_scheduler.trigger_manual_check()
        return JSONResponse(content={
            "message": "Manual price check completed",
            "success": True,
            "cycle_stats": result
        })
            
    except Exception as e:
        logger.error(f"Manual check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/interval")
async def update_monitoring_interval(request: IntervalUpdateRequest):
    """Update the monitoring interval"""
    try:
        await monitoring_scheduler.update_interval(request.minutes)
        return {
            "message": f"Monitoring interval updated to {request.minutes} minutes",
            "new_interval": request.minutes,
            "success": True
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating monitoring interval: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update interval: {e}")


@router.get("/health")
async def scheduler_health_check():
    """Health check endpoint for scheduler service"""
    try:
        status = monitoring_scheduler.get_status()
        
        # Consider healthy if running or if stopped intentionally
        is_healthy = status["is_running"] or status["last_error"] is None
        
        if is_healthy:
            return {
                "status": "healthy",
                "scheduler_running": status["is_running"],
                "last_run": status["last_run"],
                "next_run": status["next_run"]
            }
        else:
            raise HTTPException(
                status_code=503,
                detail={
                    "status": "unhealthy",
                    "scheduler_running": status["is_running"],
                    "last_error": status["last_error"]
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Scheduler health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Health check failed: {e}")