import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR

from ..config.settings import settings
from ..models.alert import Alert
from ..models.price_data import PriceData
from ..services.price_service import price_service, AssetType
from ..services.whatsapp_service import whatsapp_service
from ..utils.database import get_db_connection

logger = logging.getLogger(__name__)


class SchedulerStats:
    """Statistics tracking for the scheduler."""
    
    def __init__(self):
        self.last_run: Optional[datetime] = None
        self.next_run: Optional[datetime] = None
        self.total_runs: int = 0
        self.successful_runs: int = 0
        self.failed_runs: int = 0
        self.alerts_processed: int = 0
        self.alerts_triggered: int = 0
        self.last_error: Optional[str] = None
        self.running: bool = False
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "next_run": self.next_run.isoformat() if self.next_run else None,
            "total_runs": self.total_runs,
            "successful_runs": self.successful_runs,
            "failed_runs": self.failed_runs,
            "alerts_processed": self.alerts_processed,
            "alerts_triggered": self.alerts_triggered,
            "last_error": self.last_error,
            "running": self.running,
            "success_rate": (self.successful_runs / self.total_runs * 100) if self.total_runs > 0 else 0.0
        }


class SchedulerService:
    """Background price monitoring scheduler service."""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.stats = SchedulerStats()
        self.job_id = "price_monitoring_job"
        self._is_initialized = False
        
        # Configure scheduler event listeners
        self.scheduler.add_listener(self._on_job_executed, EVENT_JOB_EXECUTED)
        self.scheduler.add_listener(self._on_job_error, EVENT_JOB_ERROR)
    
    def initialize(self):
        """Initialize the scheduler with configured interval."""
        if self._is_initialized:
            logger.warning("Scheduler already initialized")
            return
        
        try:
            # Get monitoring interval from settings (default 5 minutes)
            interval_minutes = max(1, min(60, settings.monitoring_interval_minutes))
            
            logger.info(f"Initializing price monitoring scheduler with {interval_minutes} minute intervals")
            
            # Add the monitoring job
            self.scheduler.add_job(
                func=self._price_monitoring_job,
                trigger=IntervalTrigger(minutes=interval_minutes),
                id=self.job_id,
                name="Price Monitoring Job",
                replace_existing=True,
                max_instances=1  # Prevent overlapping runs
            )
            
            self._is_initialized = True
            logger.info("Price monitoring scheduler initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize scheduler: {e}")
            raise
    
    async def start(self):
        """Start the scheduler."""
        try:
            if not self._is_initialized:
                self.initialize()
            
            if self.scheduler.running:
                logger.warning("Scheduler is already running")
                return
            
            self.scheduler.start()
            self.stats.running = True
            
            # Update next run time
            job = self.scheduler.get_job(self.job_id)
            if job and job.next_run_time:
                self.stats.next_run = job.next_run_time
            
            logger.info("Price monitoring scheduler started")
            
        except Exception as e:
            logger.error(f"Failed to start scheduler: {e}")
            raise
    
    async def stop(self):
        """Stop the scheduler."""
        try:
            if not self.scheduler.running:
                logger.warning("Scheduler is already stopped")
                return
            
            self.scheduler.shutdown(wait=False)
            self.stats.running = False
            self.stats.next_run = None
            
            logger.info("Price monitoring scheduler stopped")
            
        except Exception as e:
            logger.error(f"Failed to stop scheduler: {e}")
            raise
    
    async def restart(self):
        """Restart the scheduler."""
        logger.info("Restarting price monitoring scheduler")
        await self.stop()
        await asyncio.sleep(1)  # Brief pause
        await self.start()
    
    async def trigger_manual_check(self) -> Dict[str, Any]:
        """Manually trigger a price monitoring check."""
        logger.info("Triggering manual price monitoring check")
        try:
            result = await self._price_monitoring_job()
            return {
                "success": True,
                "message": "Manual price check completed successfully",
                "result": result
            }
        except Exception as e:
            logger.error(f"Manual price check failed: {e}")
            return {
                "success": False,
                "message": f"Manual price check failed: {str(e)}",
                "result": None
            }
    
    async def get_status(self) -> Dict[str, Any]:
        """Get current scheduler status and statistics."""
        # Update next run time if scheduler is running
        if self.scheduler.running:
            job = self.scheduler.get_job(self.job_id)
            if job and job.next_run_time:
                self.stats.next_run = job.next_run_time
        
        status = self.stats.to_dict()
        status.update({
            "scheduler_running": self.scheduler.running,
            "monitoring_interval_minutes": settings.monitoring_interval_minutes,
            "cooldown_hours": settings.cooldown_hours
        })
        
        return status
    
    def _on_job_executed(self, event):
        """Handle successful job execution."""
        self.stats.successful_runs += 1
        self.stats.last_run = datetime.now()
        self.stats.last_error = None
        
        # Update next run time
        job = self.scheduler.get_job(self.job_id)
        if job and job.next_run_time:
            self.stats.next_run = job.next_run_time
    
    def _on_job_error(self, event):
        """Handle job execution error."""
        self.stats.failed_runs += 1
        self.stats.last_run = datetime.now()
        self.stats.last_error = str(event.exception)
        
        logger.error(f"Price monitoring job failed: {event.exception}")
    
    async def _price_monitoring_job(self) -> Dict[str, Any]:
        """
        Main price monitoring job that processes all active alerts.
        
        Returns:
            Dict with job execution results
        """
        start_time = datetime.now()
        self.stats.total_runs += 1
        
        logger.info("Starting price monitoring cycle")
        
        try:
            # Get all active alerts that can be triggered (not in cooldown)
            active_alerts = await self._get_triggerable_alerts()
            
            if not active_alerts:
                logger.info("No active alerts found for monitoring")
                return {
                    "alerts_processed": 0,
                    "alerts_triggered": 0,
                    "execution_time_seconds": (datetime.now() - start_time).total_seconds()
                }
            
            logger.info(f"Processing {len(active_alerts)} active alerts")
            
            alerts_processed = 0
            alerts_triggered = 0
            
            # Process each alert
            for alert in active_alerts:
                try:
                    triggered = await self._process_single_alert(alert)
                    alerts_processed += 1
                    
                    if triggered:
                        alerts_triggered += 1
                        
                except Exception as e:
                    logger.error(f"Failed to process alert {alert.id}: {e}")
                    # Continue processing other alerts even if one fails
                    continue
            
            # Update statistics
            self.stats.alerts_processed += alerts_processed
            self.stats.alerts_triggered += alerts_triggered
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            logger.info(
                f"Price monitoring cycle completed: "
                f"{alerts_processed} processed, {alerts_triggered} triggered, "
                f"{execution_time:.2f}s"
            )
            
            return {
                "alerts_processed": alerts_processed,
                "alerts_triggered": alerts_triggered,
                "execution_time_seconds": execution_time
            }
            
        except Exception as e:
            logger.error(f"Price monitoring job failed: {e}")
            raise
    
    async def _get_triggerable_alerts(self) -> List[Alert]:
        """
        Get all alerts that are active and can be triggered (not in cooldown).
        
        Returns:
            List of Alert objects
        """
        try:
            conn = await get_db_connection()
            
            # Query for active alerts
            query = """
            SELECT id, asset_symbol, asset_type, condition_type, threshold_price, 
                   is_active, created_at, last_triggered
            FROM alerts 
            WHERE is_active = true
            ORDER BY created_at ASC
            """
            
            result = await conn.execute(query)
            rows = await result.fetchall()
            
            alerts = []
            for row in rows:
                # Reconstruct Alert object
                alert = Alert()
                alert.id = row[0]
                alert.asset_symbol = row[1]
                alert.asset_type = row[2]
                alert.condition_type = row[3]
                alert.threshold_price = row[4]
                alert.is_active = row[5]
                alert.created_at = row[6]
                alert.last_triggered = row[7]
                
                # Only include alerts that can trigger (not in cooldown)
                if alert.can_trigger:
                    alerts.append(alert)
            
            await conn.close()
            
            logger.debug(f"Found {len(alerts)} triggerable alerts out of {len(rows)} total active alerts")
            
            return alerts
            
        except Exception as e:
            logger.error(f"Failed to fetch triggerable alerts: {e}")
            raise
    
    async def _process_single_alert(self, alert: Alert) -> bool:
        """
        Process a single alert by checking its price condition.
        
        Args:
            alert: Alert object to process
            
        Returns:
            bool: True if alert was triggered, False otherwise
        """
        try:
            logger.debug(f"Processing alert {alert.id}: {alert.asset_symbol} {alert.condition_type} ${alert.threshold_price}")
            
            # Determine asset type for price fetching
            asset_type = AssetType.STOCK if alert.asset_type == "stock" else AssetType.CRYPTO
            
            # Fetch current price
            price_data = await price_service.get_price(alert.asset_symbol, asset_type)
            
            logger.debug(f"Current price for {alert.asset_symbol}: ${price_data.current_price}")
            
            # Check if condition is met
            condition_met = False
            if alert.condition_type == ">=":
                condition_met = price_data.current_price >= alert.threshold_price
            elif alert.condition_type == "<=":
                condition_met = price_data.current_price <= alert.threshold_price
            
            if condition_met:
                logger.info(f"Alert triggered: {alert.asset_symbol} price ${price_data.current_price} {alert.condition_type} ${alert.threshold_price}")
                
                # Send WhatsApp notification
                await self._send_alert_notification(alert, price_data)
                
                # Update alert's last_triggered timestamp
                await self._update_alert_triggered_time(alert.id)
                
                return True
            else:
                logger.debug(f"Alert condition not met: {alert.asset_symbol} ${price_data.current_price} not {alert.condition_type} ${alert.threshold_price}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to process alert {alert.id} ({alert.asset_symbol}): {e}")
            # Don't re-raise, let other alerts continue processing
            return False
    
    async def _send_alert_notification(self, alert: Alert, price_data: PriceData):
        """
        Send WhatsApp notification for triggered alert.
        
        Args:
            alert: Triggered alert
            price_data: Current price data
        """
        try:
            if not whatsapp_service.is_configured():
                logger.warning("WhatsApp service not configured - skipping notification")
                return
            
            # Format condition for display
            condition = f"{alert.condition_type} ${alert.threshold_price}"
            
            notification = await whatsapp_service.send_price_alert(
                price_data=price_data,
                condition=condition,
                target_price=alert.threshold_price
            )
            
            logger.info(f"WhatsApp notification sent for alert {alert.id}: {notification.message_id}")
            
        except Exception as e:
            logger.error(f"Failed to send WhatsApp notification for alert {alert.id}: {e}")
            # Don't re-raise - notification failure shouldn't stop alert processing
    
    async def _update_alert_triggered_time(self, alert_id: int):
        """
        Update the last_triggered timestamp for an alert.
        
        Args:
            alert_id: ID of the alert to update
        """
        try:
            conn = await get_db_connection()
            
            query = """
            UPDATE alerts 
            SET last_triggered = ?
            WHERE id = ?
            """
            
            await conn.execute(query, (datetime.utcnow(), alert_id))
            await conn.commit()
            await conn.close()
            
            logger.debug(f"Updated last_triggered timestamp for alert {alert_id}")
            
        except Exception as e:
            logger.error(f"Failed to update last_triggered for alert {alert_id}: {e}")
            # Don't re-raise - this shouldn't stop alert processing


# Global scheduler service instance
scheduler_service = SchedulerService()