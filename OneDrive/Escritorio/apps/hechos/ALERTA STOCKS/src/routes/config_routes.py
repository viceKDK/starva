"""
Configuration management API routes
"""

import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from src.services.config_service import config_service, ConfigUpdateRequest


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/config", tags=["Configuration"])


class SettingUpdateRequest(BaseModel):
    """Request model for updating a single setting"""
    key: str
    value: Any


@router.get("/", response_model=Dict[str, Any])
async def get_all_configuration():
    """Get all configuration settings organized by category"""
    try:
        config = config_service.get_all_settings()
        return JSONResponse(content=config)
        
    except Exception as e:
        logger.error(f"Error getting configuration: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/editable", response_model=Dict[str, Any])
async def get_editable_configuration():
    """Get only editable (non-sensitive) configuration settings"""
    try:
        config = config_service.get_editable_settings()
        return JSONResponse(content=config)
        
    except Exception as e:
        logger.error(f"Error getting editable configuration: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/setting")
async def update_single_setting(request: SettingUpdateRequest):
    """Update a single configuration setting"""
    try:
        success, message = await config_service.update_setting(request.key, request.value)
        
        if success:
            return {
                "success": True,
                "message": message,
                "key": request.key,
                "value": request.value
            }
        else:
            raise HTTPException(status_code=400, detail=message)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating setting {request.key}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/settings")
async def update_multiple_settings(request: ConfigUpdateRequest):
    """Update multiple configuration settings"""
    try:
        results = await config_service.update_multiple_settings(request.settings)
        
        # Separate successful and failed updates
        successful = {}
        failed = {}
        
        for key, (success, message) in results.items():
            if success:
                successful[key] = message
            else:
                failed[key] = message
        
        return {
            "successful_updates": successful,
            "failed_updates": failed,
            "total_attempted": len(request.settings),
            "total_successful": len(successful),
            "total_failed": len(failed)
        }
        
    except Exception as e:
        logger.error(f"Error updating multiple settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def get_configuration_health():
    """Get configuration health status and validation results"""
    try:
        health = config_service.validate_configuration_health()
        
        if health["healthy"]:
            return JSONResponse(content=health)
        else:
            return JSONResponse(content=health, status_code=206)  # Partial content
            
    except Exception as e:
        logger.error(f"Error checking configuration health: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/restart-required")
async def get_restart_required_settings():
    """Get list of settings that require application restart to take effect"""
    try:
        settings = config_service.get_restart_required_settings()
        return {
            "restart_required_settings": settings,
            "total_count": len(settings)
        }
        
    except Exception as e:
        logger.error(f"Error getting restart-required settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_setting_value(request: SettingUpdateRequest):
    """Validate a setting value without applying it"""
    try:
        is_valid, error_msg, converted_value = config_service.validate_setting(
            request.key, 
            request.value
        )
        
        return {
            "valid": is_valid,
            "error_message": error_msg if not is_valid else None,
            "converted_value": converted_value,
            "original_value": request.value
        }
        
    except Exception as e:
        logger.error(f"Error validating setting {request.key}: {e}")
        raise HTTPException(status_code=500, detail=str(e))