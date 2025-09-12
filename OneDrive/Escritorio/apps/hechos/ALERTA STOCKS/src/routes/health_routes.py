"""
Health monitoring API routes
"""

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from typing import Optional

from ..services.health_service import health_service
from ..services.whatsapp_service import whatsapp_service
from ..utils.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api", tags=["health"])


@router.get("/notifications/stats")
async def get_notification_stats():
    """Get notification delivery statistics"""
    try:
        # Get notification history from WhatsApp service
        notifications = await whatsapp_service.get_notification_history(limit=100)
        
        total = len(notifications)
        successful = len([n for n in notifications if n.get('status') in ['delivered', 'sent']])
        failed = total - successful
        success_rate = (successful / total * 100) if total > 0 else 0
        
        # Get recent notifications (last 10)
        recent = notifications[:10]
        
        return JSONResponse(content={
            "total": total,
            "successful": successful,
            "failed": failed,
            "success_rate": success_rate,
            "recent": recent
        })
        
    except Exception as e:
        logger.error(f"Failed to get notification stats", exc_info=e)
        return JSONResponse(content={
            "total": 0,
            "successful": 0,
            "failed": 0,
            "success_rate": 0,
            "recent": []
        })


@router.get("/health/history")
async def get_health_history(timeframe: str = Query("24h", regex="^(1h|6h|24h|7d)$")):
    """Get health check history for the specified timeframe"""
    try:
        # For now, return mock data since we haven't implemented health history storage
        # In a real implementation, this would query a time-series database
        
        now = datetime.now()
        data = []
        
        # Define intervals based on timeframe
        intervals = {
            "1h": (12, 5),    # 12 points, 5 minutes apart
            "6h": (36, 10),   # 36 points, 10 minutes apart
            "24h": (48, 30),  # 48 points, 30 minutes apart
            "7d": (168, 60)   # 168 points, 1 hour apart
        }
        
        points, interval_minutes = intervals.get(timeframe, (48, 30))
        
        # Generate mock data points
        import random
        for i in range(points, -1, -1):
            timestamp = now - timedelta(minutes=i * interval_minutes)
            
            # Generate realistic mock data
            status_rand = random.random()
            if status_rand > 0.9:
                status = "critical"
                response_time = 200 + random.random() * 300
            elif status_rand > 0.7:
                status = "warning" 
                response_time = 100 + random.random() * 200
            else:
                status = "healthy"
                response_time = 20 + random.random() * 100
            
            data.append({
                "timestamp": timestamp.isoformat(),
                "overall_status": status,
                "response_time": round(response_time, 2)
            })
        
        return JSONResponse(content=data)
        
    except Exception as e:
        logger.error(f"Failed to get health history", exc_info=e)
        return JSONResponse(content=[], status_code=500)


@router.get("/health/metrics")
async def get_current_health_metrics():
    """Get current health metrics for monitoring dashboards"""
    try:
        health_data = await health_service.health_check(force_refresh=True)
        
        # Extract key metrics for monitoring systems
        metrics = {
            "overall_status": health_data["overall_status"],
            "timestamp": health_data["timestamp"],
            "components": {}
        }
        
        # Extract component-specific metrics
        for check in health_data["checks"]:
            service_name = check["service"]
            metrics["components"][service_name] = {
                "status": check["status"],
                "response_time_ms": check.get("response_time_ms"),
                "message": check["message"]
            }
            
            # Add service-specific details
            if check.get("details"):
                metrics["components"][service_name]["details"] = check["details"]
        
        return JSONResponse(content=metrics)
        
    except Exception as e:
        logger.error(f"Failed to get health metrics", exc_info=e)
        return JSONResponse(content={
            "overall_status": "critical",
            "timestamp": datetime.now().isoformat(),
            "error": "Failed to retrieve health metrics"
        }, status_code=500)