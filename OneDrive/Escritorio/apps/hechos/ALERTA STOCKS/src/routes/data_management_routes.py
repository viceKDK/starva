"""
Data management API routes
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, FileResponse
from datetime import datetime
from typing import Optional
import asyncio

from ..services.data_management_service import data_management_service
from ..utils.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/data", tags=["data_management"])


@router.get("/stats")
async def get_database_stats():
    """Get database statistics and health information"""
    try:
        stats = await data_management_service.get_database_stats()
        
        response_data = {
            "timestamp": datetime.now().isoformat(),
            "tables": []
        }
        
        total_records = 0
        total_size_mb = 0
        
        for stat in stats:
            table_data = {
                "name": stat.table_name,
                "record_count": stat.record_count,
                "size_mb": round(stat.size_mb, 2),
                "oldest_record": stat.oldest_record.isoformat() if stat.oldest_record else None,
                "newest_record": stat.newest_record.isoformat() if stat.newest_record else None
            }
            response_data["tables"].append(table_data)
            total_records += stat.record_count
            total_size_mb += stat.size_mb
        
        response_data["summary"] = {
            "total_records": total_records,
            "total_size_mb": round(total_size_mb, 2),
            "table_count": len(stats)
        }
        
        return JSONResponse(content=response_data)
        
    except Exception as e:
        logger.error("Failed to get database stats", exc_info=e)
        raise HTTPException(status_code=500, detail="Failed to retrieve database statistics")


@router.get("/backups")
async def get_backup_list():
    """Get list of available backups"""
    try:
        backups = await data_management_service.get_backup_list()
        
        backup_data = []
        for backup in backups:
            backup_data.append({
                "filename": backup.filename,
                "type": backup.type,
                "size_mb": round(backup.size_bytes / (1024 * 1024), 2),
                "created_at": backup.created_at.isoformat(),
                "compressed": backup.compressed,
                "verified": backup.verified,
                "checksum": backup.checksum[:16] + "..." if len(backup.checksum) > 16 else backup.checksum
            })
        
        return JSONResponse(content={
            "backups": backup_data,
            "total_count": len(backup_data),
            "total_size_mb": round(sum(b["size_mb"] for b in backup_data), 2)
        })
        
    except Exception as e:
        logger.error("Failed to get backup list", exc_info=e)
        raise HTTPException(status_code=500, detail="Failed to retrieve backup list")


@router.post("/backup/create")
async def create_backup(
    backup_type: str = Query("full", regex="^(full|incremental|archive)$"),
    compress: bool = Query(True)
):
    """Create a new database backup"""
    try:
        logger.info(f"Creating {backup_type} backup via API", extra={
            'extra_context': {
                'backup_type': backup_type,
                'compress': compress
            }
        })
        
        backup_info = await data_management_service.create_backup(
            backup_type=backup_type,
            compress=compress
        )
        
        return JSONResponse(content={
            "success": True,
            "message": f"{backup_type.title()} backup created successfully",
            "backup": {
                "filename": backup_info.filename,
                "type": backup_info.type,
                "size_mb": round(backup_info.size_bytes / (1024 * 1024), 2),
                "created_at": backup_info.created_at.isoformat(),
                "compressed": backup_info.compressed,
                "verified": backup_info.verified
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to create {backup_type} backup via API", exc_info=e)
        raise HTTPException(status_code=500, detail=f"Failed to create backup: {str(e)}")


@router.post("/backup/restore/{backup_filename}")
async def restore_backup(
    backup_filename: str,
    create_backup_first: bool = Query(True, description="Create backup before restore")
):
    """Restore database from backup"""
    try:
        logger.info(f"Restoring database from {backup_filename} via API", extra={
            'extra_context': {
                'backup_filename': backup_filename,
                'create_backup_first': create_backup_first
            }
        })
        
        success = await data_management_service.restore_backup(
            backup_filename=backup_filename,
            create_backup_before_restore=create_backup_first
        )
        
        if success:
            return JSONResponse(content={
                "success": True,
                "message": f"Database restored successfully from {backup_filename}"
            })
        else:
            raise HTTPException(status_code=500, detail="Backup restore failed")
            
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Backup file not found: {backup_filename}")
    except Exception as e:
        logger.error(f"Failed to restore backup {backup_filename} via API", exc_info=e)
        raise HTTPException(status_code=500, detail=f"Failed to restore backup: {str(e)}")


@router.get("/backup/download/{backup_filename}")
async def download_backup(backup_filename: str):
    """Download a backup file"""
    try:
        backup_path = data_management_service.backup_dir / backup_filename
        
        if not backup_path.exists():
            raise HTTPException(status_code=404, detail=f"Backup file not found: {backup_filename}")
        
        return FileResponse(
            path=str(backup_path),
            filename=backup_filename,
            media_type="application/octet-stream"
        )
        
    except Exception as e:
        logger.error(f"Failed to download backup {backup_filename}", exc_info=e)
        raise HTTPException(status_code=500, detail="Failed to download backup file")


@router.post("/cleanup")
async def cleanup_old_data(retention_days: int = Query(7, ge=1, le=365)):
    """Clean up old data according to retention policy"""
    try:
        logger.info(f"Starting data cleanup with {retention_days} days retention via API")
        
        cleanup_stats = await data_management_service.cleanup_old_data(retention_days=retention_days)
        
        total_cleaned = sum(cleanup_stats.values())
        
        return JSONResponse(content={
            "success": True,
            "message": f"Cleaned up {total_cleaned} old records",
            "cleanup_stats": cleanup_stats,
            "retention_days": retention_days,
            "total_records_cleaned": total_cleaned
        })
        
    except Exception as e:
        logger.error(f"Failed to cleanup old data via API", exc_info=e)
        raise HTTPException(status_code=500, detail=f"Data cleanup failed: {str(e)}")


@router.post("/maintenance")
async def perform_database_maintenance():
    """Perform comprehensive database maintenance"""
    try:
        logger.info("Starting database maintenance via API")
        
        maintenance_results = await data_management_service.perform_database_maintenance()
        
        return JSONResponse(content=maintenance_results)
        
    except Exception as e:
        logger.error("Database maintenance failed via API", exc_info=e)
        raise HTTPException(status_code=500, detail=f"Database maintenance failed: {str(e)}")


@router.delete("/backup/{backup_filename}")
async def delete_backup(backup_filename: str):
    """Delete a specific backup file"""
    try:
        backup_path = data_management_service.backup_dir / backup_filename
        
        if not backup_path.exists():
            raise HTTPException(status_code=404, detail=f"Backup file not found: {backup_filename}")
        
        backup_path.unlink()
        
        logger.info(f"Backup file deleted: {backup_filename}")
        
        return JSONResponse(content={
            "success": True,
            "message": f"Backup file {backup_filename} deleted successfully"
        })
        
    except Exception as e:
        logger.error(f"Failed to delete backup {backup_filename}", exc_info=e)
        raise HTTPException(status_code=500, detail=f"Failed to delete backup: {str(e)}")


@router.post("/cleanup/backups")
async def cleanup_old_backups():
    """Clean up old backup files based on retention policy"""
    try:
        logger.info("Starting backup cleanup via API")
        
        cleaned_count = await data_management_service.cleanup_old_backups()
        
        return JSONResponse(content={
            "success": True,
            "message": f"Cleaned up {cleaned_count} old backup files",
            "files_cleaned": cleaned_count,
            "retention_days": data_management_service.backup_retention_days
        })
        
    except Exception as e:
        logger.error("Backup cleanup failed via API", exc_info=e)
        raise HTTPException(status_code=500, detail=f"Backup cleanup failed: {str(e)}")


@router.get("/retention-policies")
async def get_retention_policies():
    """Get current data retention policies"""
    return JSONResponse(content={
        "backup_retention_days": data_management_service.backup_retention_days,
        "log_retention_days": data_management_service.log_retention_days,
        "backup_schedule": "Daily at 2:00 AM",
        "cleanup_schedule": "Weekly on Sunday at 3:00 AM",
        "backup_cleanup_schedule": "Daily at 4:00 AM"
    })


@router.put("/retention-policies")
async def update_retention_policies(
    backup_retention_days: Optional[int] = Query(None, ge=1, le=365),
    log_retention_days: Optional[int] = Query(None, ge=1, le=90)
):
    """Update data retention policies"""
    try:
        updated = {}
        
        if backup_retention_days is not None:
            data_management_service.backup_retention_days = backup_retention_days
            updated["backup_retention_days"] = backup_retention_days
        
        if log_retention_days is not None:
            data_management_service.log_retention_days = log_retention_days
            updated["log_retention_days"] = log_retention_days
        
        if updated:
            logger.info("Retention policies updated", extra={
                'extra_context': updated
            })
            
            return JSONResponse(content={
                "success": True,
                "message": "Retention policies updated successfully",
                "updated_policies": updated
            })
        else:
            return JSONResponse(content={
                "success": False,
                "message": "No policies were updated"
            })
            
    except Exception as e:
        logger.error("Failed to update retention policies", exc_info=e)
        raise HTTPException(status_code=500, detail=f"Failed to update retention policies: {str(e)}")


@router.get("/schedule/status")
async def get_scheduled_tasks_status():
    """Get status of scheduled data management tasks"""
    try:
        if not data_management_service.scheduler:
            return JSONResponse(content={
                "scheduler_running": False,
                "message": "Scheduler not initialized"
            })
        
        jobs = []
        for job in data_management_service.scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger)
            })
        
        return JSONResponse(content={
            "scheduler_running": data_management_service.scheduler.running,
            "scheduled_jobs": jobs,
            "total_jobs": len(jobs)
        })
        
    except Exception as e:
        logger.error("Failed to get scheduled tasks status", exc_info=e)
        raise HTTPException(status_code=500, detail="Failed to get scheduler status")


@router.post("/schedule/{job_id}/trigger")
async def trigger_scheduled_job(job_id: str):
    """Manually trigger a scheduled job"""
    try:
        if not data_management_service.scheduler:
            raise HTTPException(status_code=503, detail="Scheduler not available")
        
        job = data_management_service.scheduler.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
        
        # Trigger the job manually
        job.modify(next_run_time=datetime.now())
        
        logger.info(f"Manually triggered scheduled job: {job_id}")
        
        return JSONResponse(content={
            "success": True,
            "message": f"Job {job_id} triggered successfully",
            "job_name": job.name
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to trigger job {job_id}", exc_info=e)
        raise HTTPException(status_code=500, detail=f"Failed to trigger job: {str(e)}")