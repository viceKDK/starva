"""
Price Monitor - WhatsApp Price Monitoring Application
Main application entry point
"""

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
import uvicorn
import logging
from pathlib import Path
from datetime import datetime

from src.config.settings import get_settings
from src.utils.database import init_database
from src.utils.logging_config import setup_application_logging, get_logger
from src.services.health_service import health_service
from src.routes.alert_routes import router as alert_router
from src.routes.advanced_alert_routes import router as advanced_alert_router
from src.routes.scheduler_routes import router as scheduler_router
from src.routes.config_routes import router as config_router
from src.routes.health_routes import router as health_router
from src.routes.data_management_routes import router as data_router
from src.services.monitoring_scheduler import monitoring_scheduler
from src.services.data_management_service import data_management_service

# Initialize settings
settings = get_settings()

# Setup structured logging
setup_application_logging()
logger = get_logger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Price Monitor",
    description="WhatsApp Price Monitoring Application",
    version="1.0.0"
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="templates")

# Include routers
app.include_router(alert_router)
app.include_router(advanced_alert_router)
app.include_router(scheduler_router)
app.include_router(config_router)
app.include_router(health_router)
app.include_router(data_router)


@app.on_event("startup")
async def startup_event():
    """Initialize application on startup with comprehensive validation"""
    app_settings = get_settings()
    logger.info("Starting Price Monitor application", extra={
        'extra_context': {
            'version': '1.0.0',
            'host': app_settings.host,
            'port': app_settings.port,
            'debug': app_settings.debug
        }
    })
    
    # Perform startup validation
    try:
        logger.info("Performing startup validation")
        validation_results = await health_service.startup_validation()
        
        if not validation_results["startup_ready"]:
            critical_issues = validation_results["critical_issues"]
            logger.error("Startup validation failed", extra={
                'extra_context': {
                    'critical_issues': critical_issues,
                    'warnings': validation_results["warnings"]
                }
            })
            # Log issues but don't fail startup - let application start in degraded mode
            logger.warning("Application starting in degraded mode due to validation issues")
        else:
            logger.info("Startup validation completed successfully", extra={
                'extra_context': {
                    'warnings_count': len(validation_results["warnings"]),
                    'duration_ms': validation_results["validation_duration_ms"]
                }
            })
            
    except Exception as e:
        logger.error("Startup validation encountered an error", exc_info=e)
        # Continue startup even if validation fails
    
    # Initialize database
    try:
        await init_database()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error("Failed to initialize database", exc_info=e, extra={
            'extra_context': {'operation': 'database_init'}
        })
        raise
    
    # Initialize and start scheduler
    try:
        await monitoring_scheduler.start()
        logger.info("Price monitoring scheduler started successfully", extra={
            'extra_context': {
                'interval_minutes': app_settings.monitoring_interval_minutes
            }
        })
    except Exception as e:
        logger.error("Failed to start monitoring scheduler", exc_info=e, extra={
            'extra_context': {'operation': 'scheduler_start'}
        })
        raise
    
    # Initialize data management service
    try:
        await data_management_service.initialize()
        logger.info("Data management service initialized successfully")
    except Exception as e:
        logger.error("Failed to initialize data management service", exc_info=e, extra={
            'extra_context': {'operation': 'data_management_init'}
        })
        # Don't raise here - let the app start without data management if needed


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown"""
    logger.info("Shutting down Price Monitor application", extra={
        'extra_context': {'shutdown_initiated': True}
    })
    
    try:
        await monitoring_scheduler.stop()
        logger.info("Price monitoring scheduler stopped successfully")
    except Exception as e:
        logger.error("Failed to stop scheduler during shutdown", exc_info=e, extra={
            'extra_context': {'operation': 'scheduler_stop'}
        })
    
    # Shutdown data management service
    try:
        await data_management_service.shutdown()
        logger.info("Data management service stopped successfully")
    except Exception as e:
        logger.error("Failed to stop data management service during shutdown", exc_info=e, extra={
            'extra_context': {'operation': 'data_management_stop'}
        })


@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Main dashboard page"""
    return templates.TemplateResponse("dashboard.html", {"request": request})


@app.get("/settings", response_class=HTMLResponse)
async def settings(request: Request):
    """Settings and configuration page"""
    return templates.TemplateResponse("settings.html", {"request": request})


@app.get("/health", response_class=HTMLResponse)
async def health_dashboard(request: Request):
    """Health monitoring dashboard page"""
    return templates.TemplateResponse("health.html", {"request": request})


@app.get("/data", response_class=HTMLResponse)
async def data_management_dashboard(request: Request):
    """Data management and backup page"""
    return templates.TemplateResponse("data-management.html", {"request": request})


@app.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return JSONResponse(
        content={
            "status": "healthy",
            "service": "price-monitor",
            "version": "1.0.0",
            "timestamp": datetime.now().isoformat()
        }
    )


@app.get("/health/detailed")
async def detailed_health_check():
    """Comprehensive health check with all system components"""
    health_results = await health_service.health_check()
    
    # Determine HTTP status code based on health
    status_code = 200
    if health_results["overall_status"] == "critical":
        status_code = 503  # Service Unavailable
    elif health_results["overall_status"] == "warning":
        status_code = 200  # OK but with warnings
    
    return JSONResponse(
        content=health_results,
        status_code=status_code
    )


@app.get("/health/startup")
async def startup_validation_status():
    """Get startup validation results"""
    if not hasattr(health_service, '_last_startup_validation'):
        return JSONResponse(
            content={
                "message": "Startup validation not yet performed",
                "status": "unknown"
            },
            status_code=202
        )
    
    # Re-run startup validation to get current status
    validation_results = await health_service.startup_validation()
    
    status_code = 200
    if not validation_results["startup_ready"]:
        status_code = 503
    
    return JSONResponse(
        content=validation_results,
        status_code=status_code
    )


if __name__ == "__main__":
    app_settings = get_settings()
    logger.info(f"Starting server on {app_settings.host}:{app_settings.port}")
    uvicorn.run(
        "main:app",
        host=app_settings.host,
        port=app_settings.port,
        reload=app_settings.debug,
        log_level=app_settings.log_level.lower()
    )
