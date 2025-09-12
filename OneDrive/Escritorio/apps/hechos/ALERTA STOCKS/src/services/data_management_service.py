"""
Data management and backup service
Handles automated backups, data cleanup, and database maintenance
"""

import asyncio
import sqlite3
import shutil
import gzip
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import json

from ..utils.logging_config import get_logger, log_database_operation, log_performance
from ..utils.database import get_database, get_db_connection
from ..config.settings import get_settings
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger


logger = get_logger(__name__)


@dataclass
class BackupInfo:
    """Information about a database backup"""
    filename: str
    path: str
    size_bytes: int
    created_at: datetime
    type: str  # "full", "incremental", "archive"
    checksum: str
    compressed: bool = False
    verified: bool = False


@dataclass
class DataStats:
    """Database statistics"""
    table_name: str
    record_count: int
    size_mb: float
    oldest_record: Optional[datetime]
    newest_record: Optional[datetime]


class DataManagementService:
    """Service for data management, backup, and maintenance operations"""
    
    def __init__(self):
        self.settings = get_settings()
        self.scheduler: Optional[AsyncIOScheduler] = None
        self.backup_dir = Path("backups")
        self.archive_dir = Path("archives")
        self.backup_retention_days = 30
        self.log_retention_days = 7
        
        # Ensure backup directories exist
        self.backup_dir.mkdir(exist_ok=True)
        self.archive_dir.mkdir(exist_ok=True)
        
    async def initialize(self):
        """Initialize the data management service with scheduled tasks"""
        logger.info("Initializing data management service")
        
        try:
            # Initialize scheduler for automated tasks
            self.scheduler = AsyncIOScheduler()
            
            # Schedule daily backups at 2 AM
            self.scheduler.add_job(
                func=self.perform_automated_backup,
                trigger=CronTrigger(hour=2, minute=0),
                id="daily_backup",
                name="Daily Database Backup",
                replace_existing=True
            )
            
            # Schedule weekly cleanup at 3 AM on Sundays
            self.scheduler.add_job(
                func=self.perform_automated_cleanup,
                trigger=CronTrigger(day_of_week=0, hour=3, minute=0),  # Sunday 3 AM
                id="weekly_cleanup", 
                name="Weekly Data Cleanup",
                replace_existing=True
            )
            
            # Schedule backup cleanup daily at 4 AM
            self.scheduler.add_job(
                func=self.cleanup_old_backups,
                trigger=CronTrigger(hour=4, minute=0),
                id="backup_cleanup",
                name="Backup Cleanup",
                replace_existing=True
            )
            
            self.scheduler.start()
            
            logger.info("Data management service initialized with scheduled tasks", extra={
                'extra_context': {
                    'backup_dir': str(self.backup_dir),
                    'archive_dir': str(self.archive_dir),
                    'backup_retention_days': self.backup_retention_days
                }
            })
            
        except Exception as e:
            logger.error("Failed to initialize data management service", exc_info=e)
            raise
    
    async def shutdown(self):
        """Shutdown the data management service"""
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown(wait=False)
            logger.info("Data management service scheduler stopped")
    
    async def create_backup(self, backup_type: str = "full", compress: bool = True) -> BackupInfo:
        """
        Create a database backup
        
        Args:
            backup_type: Type of backup ("full", "incremental", "archive")
            compress: Whether to compress the backup
            
        Returns:
            BackupInfo object with backup details
        """
        start_time = datetime.now()
        
        logger.info(f"Starting {backup_type} database backup", extra={
            'extra_context': {
                'backup_type': backup_type,
                'compress': compress
            }
        })
        
        try:
            # Generate backup filename with timestamp
            timestamp = start_time.strftime("%Y%m%d_%H%M%S")
            base_filename = f"price_monitor_{backup_type}_{timestamp}.db"
            
            if backup_type == "full":
                backup_info = await self._create_full_backup(base_filename, compress)
            else:
                # For now, only support full backups
                # Incremental backups would require change tracking
                backup_info = await self._create_full_backup(base_filename, compress)
            
            # Verify backup integrity
            await self._verify_backup(backup_info)
            
            duration_ms = (datetime.now() - start_time).total_seconds() * 1000
            log_database_operation(
                "backup_create", "database", 
                duration_ms=duration_ms,
                backup_type=backup_type,
                file_size_mb=backup_info.size_bytes / 1024 / 1024,
                compressed=compress
            )
            
            logger.info(f"Backup created successfully", extra={
                'extra_context': {
                    'filename': backup_info.filename,
                    'size_mb': backup_info.size_bytes / 1024 / 1024,
                    'duration_ms': duration_ms,
                    'verified': backup_info.verified
                }
            })
            
            return backup_info
            
        except Exception as e:
            logger.error(f"Failed to create {backup_type} backup", exc_info=e)
            raise
    
    async def _create_full_backup(self, filename: str, compress: bool) -> BackupInfo:
        """Create a full database backup using SQLite's backup API"""
        
        # Get source database path
        db_path = Path(self.settings.database_path)
        backup_path = self.backup_dir / filename
        
        if compress:
            backup_path = backup_path.with_suffix(backup_path.suffix + ".gz")
        
        try:
            # Use SQLite's backup API for consistent backup
            source_conn = sqlite3.connect(str(db_path))
            
            if compress:
                # Create compressed backup
                with gzip.open(backup_path, 'wb') as gz_file:
                    # First create uncompressed backup in memory
                    temp_backup = sqlite3.connect(':memory:')
                    source_conn.backup(temp_backup)
                    
                    # Write compressed backup
                    for line in temp_backup.iterdump():
                        gz_file.write((line + '\n').encode('utf-8'))
                    
                    temp_backup.close()
            else:
                # Create uncompressed backup
                backup_conn = sqlite3.connect(str(backup_path))
                source_conn.backup(backup_conn)
                backup_conn.close()
            
            source_conn.close()
            
            # Calculate file size and checksum
            size_bytes = backup_path.stat().st_size
            checksum = await self._calculate_checksum(backup_path)
            
            return BackupInfo(
                filename=backup_path.name,
                path=str(backup_path),
                size_bytes=size_bytes,
                created_at=datetime.now(),
                type="full",
                checksum=checksum,
                compressed=compress,
                verified=False
            )
            
        except Exception as e:
            # Clean up partial backup on failure
            if backup_path.exists():
                backup_path.unlink()
            raise
    
    async def _verify_backup(self, backup_info: BackupInfo) -> bool:
        """Verify backup integrity by testing database connection"""
        try:
            backup_path = Path(backup_info.path)
            
            if backup_info.compressed:
                # For compressed backups, we'd need to decompress and test
                # For now, just verify the file exists and has content
                if not backup_path.exists() or backup_path.stat().st_size == 0:
                    raise ValueError("Backup file is empty or missing")
                backup_info.verified = True
                return True
            else:
                # Test uncompressed SQLite backup
                test_conn = sqlite3.connect(str(backup_path))
                cursor = test_conn.execute("SELECT COUNT(*) FROM sqlite_master")
                cursor.fetchone()
                cursor.close()
                test_conn.close()
                
                backup_info.verified = True
                return True
                
        except Exception as e:
            logger.warning(f"Backup verification failed: {e}")
            backup_info.verified = False
            return False
    
    async def _calculate_checksum(self, file_path: Path) -> str:
        """Calculate SHA256 checksum of a file"""
        sha256_hash = hashlib.sha256()
        
        with open(file_path, "rb") as f:
            # Read file in chunks to handle large files
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        
        return sha256_hash.hexdigest()
    
    async def get_backup_list(self) -> List[BackupInfo]:
        """Get list of all available backups"""
        backups = []
        
        try:
            for backup_file in self.backup_dir.glob("*.db*"):
                # Parse filename to extract information
                try:
                    size_bytes = backup_file.stat().st_size
                    created_at = datetime.fromtimestamp(backup_file.stat().st_mtime)
                    
                    # Determine backup type from filename
                    backup_type = "full"
                    if "_incremental_" in backup_file.name:
                        backup_type = "incremental"
                    elif "_archive_" in backup_file.name:
                        backup_type = "archive"
                    
                    # Check if compressed
                    compressed = backup_file.suffix == ".gz"
                    
                    # Calculate checksum for verification
                    checksum = await self._calculate_checksum(backup_file)
                    
                    backup_info = BackupInfo(
                        filename=backup_file.name,
                        path=str(backup_file),
                        size_bytes=size_bytes,
                        created_at=created_at,
                        type=backup_type,
                        checksum=checksum,
                        compressed=compressed,
                        verified=False  # Would need separate verification pass
                    )
                    
                    backups.append(backup_info)
                    
                except Exception as e:
                    logger.warning(f"Failed to process backup file {backup_file}: {e}")
                    continue
            
            # Sort by creation time (newest first)
            backups.sort(key=lambda x: x.created_at, reverse=True)
            
        except Exception as e:
            logger.error("Failed to get backup list", exc_info=e)
        
        return backups
    
    async def restore_backup(self, backup_filename: str, create_backup_before_restore: bool = True) -> bool:
        """
        Restore database from backup
        
        Args:
            backup_filename: Name of backup file to restore
            create_backup_before_restore: Whether to create backup of current database first
            
        Returns:
            True if restore successful, False otherwise
        """
        start_time = datetime.now()
        backup_path = self.backup_dir / backup_filename
        
        if not backup_path.exists():
            raise FileNotFoundError(f"Backup file not found: {backup_filename}")
        
        logger.info(f"Starting database restoration from {backup_filename}", extra={
            'extra_context': {
                'backup_file': backup_filename,
                'create_backup_first': create_backup_before_restore
            }
        })
        
        try:
            # Create backup of current database before restore
            if create_backup_before_restore:
                await self.create_backup(backup_type="archive", compress=True)
            
            # Close any existing database connections
            # (In a real application, you'd coordinate with other services)
            
            db_path = Path(self.settings.database_path)
            
            if backup_filename.endswith('.gz'):
                # Restore from compressed backup
                with gzip.open(backup_path, 'rt') as gz_file:
                    # Create new database from SQL dump
                    restored_conn = sqlite3.connect(str(db_path))
                    restored_conn.executescript(gz_file.read())
                    restored_conn.close()
            else:
                # Restore from uncompressed SQLite backup
                shutil.copy2(backup_path, db_path)
            
            # Verify restored database
            await self._verify_database_integrity()
            
            duration_ms = (datetime.now() - start_time).total_seconds() * 1000
            log_database_operation(
                "backup_restore", "database",
                duration_ms=duration_ms,
                backup_file=backup_filename
            )
            
            logger.info(f"Database restored successfully from {backup_filename}", extra={
                'extra_context': {
                    'duration_ms': duration_ms
                }
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to restore database from {backup_filename}", exc_info=e)
            return False
    
    async def _verify_database_integrity(self) -> bool:
        """Verify database integrity after restore"""
        try:
            db = await get_database()
            
            # Run SQLite integrity check
            cursor = await db.execute("PRAGMA integrity_check")
            result = await cursor.fetchone()
            await cursor.close()
            
            if result[0] != "ok":
                raise ValueError(f"Database integrity check failed: {result[0]}")
            
            # Verify key tables exist and have expected structure
            cursor = await db.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name IN ('alerts', 'notification_attempts')
            """)
            tables = await cursor.fetchall()
            await cursor.close()
            
            expected_tables = {"alerts", "notification_attempts"}
            found_tables = {table[0] for table in tables}
            
            if not expected_tables.issubset(found_tables):
                missing = expected_tables - found_tables
                raise ValueError(f"Missing required tables: {missing}")
            
            logger.info("Database integrity verification passed")
            return True
            
        except Exception as e:
            logger.error("Database integrity verification failed", exc_info=e)
            return False
    
    async def cleanup_old_data(self, retention_days: int = None) -> Dict[str, int]:
        """
        Clean up old data according to retention policies
        
        Args:
            retention_days: Days to keep data (uses configured default if None)
            
        Returns:
            Dictionary with cleanup statistics
        """
        if retention_days is None:
            retention_days = self.log_retention_days
            
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        cleanup_stats = {}
        
        logger.info(f"Starting data cleanup for records older than {retention_days} days", extra={
            'extra_context': {
                'cutoff_date': cutoff_date.isoformat(),
                'retention_days': retention_days
            }
        })
        
        try:
            db = await get_database()
            
            # Clean up old notification attempts
            cursor = await db.execute("""
                DELETE FROM notification_attempts 
                WHERE sent_at < ?
            """, (cutoff_date.isoformat(),))
            
            notification_cleanup_count = cursor.rowcount
            cleanup_stats['notification_attempts'] = notification_cleanup_count
            await cursor.close()
            
            # Clean up triggered alerts (keep alert definitions but remove old trigger records)
            # For now, we just update last_triggered times, but in future might have separate trigger log
            
            await db.commit()
            
            total_cleaned = sum(cleanup_stats.values())
            
            log_database_operation(
                "data_cleanup", "multiple_tables",
                affected_rows=total_cleaned,
                retention_days=retention_days
            )
            
            logger.info(f"Data cleanup completed", extra={
                'extra_context': {
                    'records_cleaned': cleanup_stats,
                    'total_cleaned': total_cleaned
                }
            })
            
            return cleanup_stats
            
        except Exception as e:
            logger.error("Data cleanup failed", exc_info=e)
            return {}
    
    async def cleanup_old_backups(self) -> int:
        """Clean up old backup files based on retention policy"""
        try:
            cutoff_date = datetime.now() - timedelta(days=self.backup_retention_days)
            cleaned_count = 0
            
            for backup_file in self.backup_dir.glob("*.db*"):
                file_mtime = datetime.fromtimestamp(backup_file.stat().st_mtime)
                
                if file_mtime < cutoff_date:
                    try:
                        backup_file.unlink()
                        cleaned_count += 1
                        logger.debug(f"Deleted old backup: {backup_file.name}")
                    except Exception as e:
                        logger.warning(f"Failed to delete old backup {backup_file.name}: {e}")
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} old backup files")
            
            return cleaned_count
            
        except Exception as e:
            logger.error("Backup cleanup failed", exc_info=e)
            return 0
    
    async def get_database_stats(self) -> List[DataStats]:
        """Get database statistics for monitoring and management"""
        try:
            db = await get_database()
            stats = []
            
            # Get stats for each table
            tables = [
                ("alerts", "created_at"),
                ("notification_attempts", "sent_at")
            ]
            
            for table_name, date_column in tables:
                # Get record count
                cursor = await db.execute(f"SELECT COUNT(*) FROM {table_name}")
                count_result = await cursor.fetchone()
                record_count = count_result[0] if count_result else 0
                await cursor.close()
                
                # Get date range
                oldest_record = None
                newest_record = None
                
                if record_count > 0:
                    cursor = await db.execute(f"""
                        SELECT MIN({date_column}), MAX({date_column}) 
                        FROM {table_name}
                    """)
                    date_result = await cursor.fetchone()
                    await cursor.close()
                    
                    if date_result and date_result[0]:
                        oldest_record = datetime.fromisoformat(date_result[0])
                        newest_record = datetime.fromisoformat(date_result[1])
                
                # Estimate table size (rough calculation)
                try:
                    cursor = await db.execute("PRAGMA page_count")
                    page_count_result = await cursor.fetchone()
                    page_count = page_count_result[0] if page_count_result else 0
                    await cursor.close()
                    
                    cursor = await db.execute("PRAGMA page_size")
                    page_size_result = await cursor.fetchone()
                    page_size = page_size_result[0] if page_size_result else 0
                    await cursor.close()
                    
                    size_bytes = page_count * page_size
                except Exception as e:
                    logger.warning(f"Failed to get table size for {table_name}: {e}")
                    size_bytes = 0
                size_mb = size_bytes / (1024 * 1024)
                
                stats.append(DataStats(
                    table_name=table_name,
                    record_count=record_count,
                    size_mb=size_mb,
                    oldest_record=oldest_record,
                    newest_record=newest_record
                ))
            
            return stats
            
        except Exception as e:
            logger.error("Failed to get database statistics", exc_info=e)
            return []
    
    async def perform_database_maintenance(self) -> Dict[str, Any]:
        """Perform comprehensive database maintenance"""
        maintenance_results = {
            "started_at": datetime.now().isoformat(),
            "operations": {},
            "success": True,
            "errors": []
        }
        
        logger.info("Starting database maintenance")
        
        try:
            db = await get_database()
            
            # 1. VACUUM database to reclaim space and optimize
            try:
                await db.execute("VACUUM")
                maintenance_results["operations"]["vacuum"] = "completed"
            except Exception as e:
                maintenance_results["operations"]["vacuum"] = f"failed: {str(e)}"
                maintenance_results["errors"].append(f"VACUUM failed: {str(e)}")
            
            # 2. ANALYZE to update statistics
            try:
                await db.execute("ANALYZE")
                maintenance_results["operations"]["analyze"] = "completed"
            except Exception as e:
                maintenance_results["operations"]["analyze"] = f"failed: {str(e)}"
                maintenance_results["errors"].append(f"ANALYZE failed: {str(e)}")
            
            # 3. Integrity check
            try:
                cursor = await db.execute("PRAGMA integrity_check")
                result = await cursor.fetchone()
                await cursor.close()
                
                if result[0] == "ok":
                    maintenance_results["operations"]["integrity_check"] = "passed"
                else:
                    maintenance_results["operations"]["integrity_check"] = f"failed: {result[0]}"
                    maintenance_results["errors"].append(f"Integrity check failed: {result[0]}")
                    maintenance_results["success"] = False
            except Exception as e:
                maintenance_results["operations"]["integrity_check"] = f"error: {str(e)}"
                maintenance_results["errors"].append(f"Integrity check error: {str(e)}")
            
            await db.commit()
            
            # 4. Update statistics
            stats = await self.get_database_stats()
            maintenance_results["database_stats"] = [
                {
                    "table": stat.table_name,
                    "records": stat.record_count,
                    "size_mb": round(stat.size_mb, 2)
                }
                for stat in stats
            ]
            
            maintenance_results["completed_at"] = datetime.now().isoformat()
            
            if maintenance_results["success"]:
                logger.info("Database maintenance completed successfully")
            else:
                logger.warning("Database maintenance completed with errors", extra={
                    'extra_context': {'errors': maintenance_results["errors"]}
                })
            
            return maintenance_results
            
        except Exception as e:
            maintenance_results["success"] = False
            maintenance_results["errors"].append(f"Maintenance error: {str(e)}")
            logger.error("Database maintenance failed", exc_info=e)
            return maintenance_results
    
    # Automated task methods
    async def perform_automated_backup(self):
        """Automated backup task"""
        try:
            await self.create_backup(backup_type="full", compress=True)
            logger.info("Automated backup completed successfully")
        except Exception as e:
            logger.error("Automated backup failed", exc_info=e)
    
    async def perform_automated_cleanup(self):
        """Automated data cleanup task"""
        try:
            await self.cleanup_old_data()
            await self.perform_database_maintenance()
            logger.info("Automated cleanup and maintenance completed successfully")
        except Exception as e:
            logger.error("Automated cleanup failed", exc_info=e)


# Global data management service instance
data_management_service = DataManagementService()