"""
Automated price monitoring scheduler service
"""

import asyncio
import logging
import time
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED, JobExecutionEvent
import aiosqlite

from src.config.settings import get_settings
from src.utils.database import get_db_connection
from src.utils.logging_config import get_logger, log_performance, log_database_operation
from src.models.alert import Alert
from src.services.price_service import PriceService, AssetType
from src.services.whatsapp_service import WhatsAppService
from src.models.price_data import APIError
from src.services.advanced_alert_service import AdvancedAlertService


logger = get_logger(__name__)


class MonitoringStats:
    """Statistics tracking for monitoring cycles"""
    
    def __init__(self):
        self.last_run: Optional[datetime] = None
        self.next_run: Optional[datetime] = None
        self.total_cycles: int = 0
        self.successful_cycles: int = 0
        self.failed_cycles: int = 0
        self.alerts_processed: int = 0
        self.alerts_triggered: int = 0
        self.last_error: Optional[str] = None
        self.is_running: bool = False


class MonitoringScheduler:
    """
    Automated price monitoring scheduler using APScheduler
    """
    
    def __init__(self):
        self.scheduler: Optional[AsyncIOScheduler] = None
        self.price_service = PriceService()
        self.whatsapp_service = WhatsAppService()
        self.stats = MonitoringStats()
        self.settings = get_settings()
        self._job_id = "price_monitoring_job"
        
    async def start(self) -> None:
        """Start the monitoring scheduler"""
        if self.scheduler and self.scheduler.running:
            logger.warning("Scheduler is already running")
            return
            
        try:
            # Create scheduler with timezone awareness
            self.scheduler = AsyncIOScheduler(timezone=timezone.utc)
            
            # Add job event listeners
            self.scheduler.add_listener(self._job_error_listener, EVENT_JOB_ERROR)
            self.scheduler.add_listener(self._job_success_listener, EVENT_JOB_EXECUTED)
            
            # Add the monitoring job with interval trigger
            trigger = IntervalTrigger(
                minutes=self.settings.monitoring_interval_minutes,
                timezone=timezone.utc
            )
            
            self.scheduler.add_job(
                func=self._price_monitoring_job,
                trigger=trigger,
                id=self._job_id,
                name="Price Monitoring Job",
                replace_existing=True,
                misfire_grace_time=30  # Allow 30 seconds grace for delayed execution
            )
            
            # Start the scheduler
            self.scheduler.start()
            self.stats.is_running = True
            
            # Update next run time
            job = self.scheduler.get_job(self._job_id)
            if job and job.next_run_time:
                self.stats.next_run = job.next_run_time
                
            logger.info(f"Price monitoring scheduler started", extra={
                'extra_context': {
                    'interval_minutes': self.settings.monitoring_interval_minutes,
                    'job_id': self._job_id,
                    'next_run': self.stats.next_run.isoformat() if self.stats.next_run else None
                }
            })
            
        except Exception as e:
            logger.error(f"Failed to start monitoring scheduler", exc_info=e, extra={
                'extra_context': {
                    'operation': 'scheduler_start',
                    'interval_minutes': self.settings.monitoring_interval_minutes
                }
            })
            self.stats.last_error = str(e)
            raise
    
    async def stop(self) -> None:
        """Stop the monitoring scheduler"""
        if not self.scheduler or not self.scheduler.running:
            logger.warning("Scheduler is not running")
            return
            
        try:
            self.scheduler.shutdown(wait=True)
            self.stats.is_running = False
            self.stats.next_run = None
            logger.info("Price monitoring scheduler stopped")
            
        except Exception as e:
            logger.error(f"Error stopping scheduler: {e}")
            raise
    
    async def restart(self) -> None:
        """Restart the monitoring scheduler"""
        logger.info("Restarting monitoring scheduler...")
        await self.stop()
        await asyncio.sleep(1)  # Brief pause
        await self.start()
        
    async def trigger_manual_check(self) -> Dict[str, Any]:
        """Manually trigger a price check cycle"""
        logger.info("Manual price check triggered")
        return await self._price_monitoring_job()
        
    def get_status(self) -> Dict[str, Any]:
        """Get current scheduler status and statistics"""
        job = None
        if self.scheduler:
            job = self.scheduler.get_job(self._job_id)
            if job and job.next_run_time:
                self.stats.next_run = job.next_run_time
                
        return {
            "is_running": self.stats.is_running,
            "monitoring_interval_minutes": self.settings.monitoring_interval_minutes,
            "last_run": self.stats.last_run.isoformat() if self.stats.last_run else None,
            "next_run": self.stats.next_run.isoformat() if self.stats.next_run else None,
            "statistics": {
                "total_cycles": self.stats.total_cycles,
                "successful_cycles": self.stats.successful_cycles,
                "failed_cycles": self.stats.failed_cycles,
                "alerts_processed": self.stats.alerts_processed,
                "alerts_triggered": self.stats.alerts_triggered,
                "success_rate": (
                    self.stats.successful_cycles / max(self.stats.total_cycles, 1) * 100
                ) if self.stats.total_cycles > 0 else 0
            },
            "last_error": self.stats.last_error
        }
    
    async def update_interval(self, minutes: int) -> None:
        """Update monitoring interval and restart scheduler"""
        if not 1 <= minutes <= 60:
            raise ValueError("Monitoring interval must be between 1 and 60 minutes")
            
        # Update settings (would need to persist this for real applications)
        self.settings.monitoring_interval_minutes = minutes
        
        if self.scheduler and self.scheduler.running:
            await self.restart()
            
        logger.info(f"Monitoring interval updated to {minutes} minutes")
    
    async def _price_monitoring_job(self) -> Dict[str, Any]:
        """
        Main price monitoring job that checks all active alerts
        """
        cycle_start = datetime.now(timezone.utc)
        start_time = time.time()
        self.stats.last_run = cycle_start
        self.stats.total_cycles += 1
        
        cycle_stats = {
            "start_time": cycle_start.isoformat(),
            "alerts_checked": 0,
            "alerts_triggered": 0,
            "errors": [],
            "triggered_alerts": []
        }
        
        logger.info("Starting price monitoring cycle", extra={
            'extra_context': {
                'cycle_number': self.stats.total_cycles,
                'cycle_start': cycle_start.isoformat()
            }
        })
        
        try:
            
            # Get all active alerts
            conn = await get_db_connection()
            try:
                cursor = await conn.execute(
                    "SELECT * FROM alerts WHERE is_active = 1"
                )
                alert_rows = await cursor.fetchall()
                await cursor.close()
            except Exception as db_error:
                logger.error(f"Database query failed: {db_error}")
                raise
            
            # Fetch active advanced alerts
            cursor2 = await conn.execute("SELECT * FROM advanced_alerts WHERE is_active = 1")
            adv_rows = await cursor2.fetchall()
            await cursor2.close()

            if not alert_rows and not adv_rows:
                logger.info("No active alerts to process")
                self.stats.successful_cycles += 1
                cycle_stats["message"] = "No active alerts to process"
                return cycle_stats
            
            # Convert rows to alert-like objects for processing
            active_alerts = []
            for row in alert_rows:
                alert_dict = {
                    'id': row[0],
                    'asset_symbol': row[1],
                    'asset_type': row[2],
                    'condition_type': row[3],
                    'threshold_price': row[4],
                    'is_active': bool(row[5]),
                    'created_at': row[6],
                    'last_triggered': row[7]
                }
                active_alerts.append(alert_dict)
            
            logger.info(f"Processing {len(active_alerts)} basic and {len(adv_rows)} advanced alerts")
            
            # Process each alert
            for alert in active_alerts:
                try:
                    logger.debug(f"Checking alert {alert['id']}: {alert['asset_symbol']} {alert['condition_type']} {alert['threshold_price']}")
                    await self._check_alert(alert, cycle_stats)
                    cycle_stats["alerts_checked"] += 1
                    logger.debug(f"Alert {alert['id']} processed successfully")
                    
                except Exception as alert_error:
                    error_msg = f"Error checking alert {alert['id']}: {alert_error}"
                    logger.error(error_msg, exc_info=True)
                    cycle_stats["errors"].append(error_msg)
                    # Continue with next alert even if one fails
                    
            # Update global stats
            self.stats.alerts_processed += cycle_stats["alerts_checked"]
            self.stats.alerts_triggered += cycle_stats["alerts_triggered"]

            # Process advanced alerts separately (do not count into alerts_checked to keep metric consistent)
            for row in adv_rows:
                try:
                    # Map row to dict with column names via description if possible
                    # Fallback to index positions based on creation order in init_database
                    columns = [
                        "id","asset_symbol","asset_type","alert_type","alert_name","conditions","timeframe",
                        "check_frequency_minutes","is_active","created_at","last_triggered","last_checked",
                        "trigger_count","notification_enabled","notification_channels","max_triggers","expiry_date",
                        "description","notes"
                    ]
                    if hasattr(row, 'keys'):
                        adv = dict(row)
                    else:
                        adv = {columns[i]: row[i] for i in range(min(len(columns), len(row)))}

                    triggered, context = await AdvancedAlertService.evaluate_and_maybe_trigger(adv)
                    # Update last_checked
                    try:
                        await conn.execute(
                            "UPDATE advanced_alerts SET last_checked = ? WHERE id = ?",
                            (datetime.now(timezone.utc).isoformat(), adv["id"]),
                        )
                        await conn.commit()
                    except Exception:
                        pass

                    if triggered:
                        cycle_stats["alerts_triggered"] += 1
                        # Build message and send
                        try:
                            asset_type = AssetType.STOCK if adv["asset_type"] == 'stock' else AssetType.CRYPTO
                            price_data = await self.price_service.get_price(adv["asset_symbol"], asset_type)
                            if adv["alert_type"] == "percentage_change":
                                cpct = context.get("change_pct")
                                cond_txt = f"Cambio >= {abs(cpct):.2f}%" if cpct is not None else "Cambio porcentual"
                                target = context.get("previous_close") or context.get("base_price") or price_data.current_price
                            else:
                                ind = context.get("indicator","ind")
                                val = context.get("value")
                                thr = context.get("threshold")
                                cond_txt = f"{ind.upper()} {val:.2f} vs {thr:.2f}"
                                target = price_data.current_price
                            await self._send_alert_notification(price_data, cond_txt, target)
                        except Exception as e:
                            logger.warning(f"Failed sending advanced alert notification: {e}")
                        # Update trigger fields and insert history
                        try:
                            now = datetime.now(timezone.utc).isoformat()
                            await conn.execute(
                                "UPDATE advanced_alerts SET last_triggered = ?, trigger_count = COALESCE(trigger_count,0)+1 WHERE id = ?",
                                (now, adv["id"]),
                            )
                            await conn.execute(
                                """
                                INSERT INTO alert_trigger_history (
                                    alert_id, triggered_at, trigger_price, trigger_value, trigger_conditions_met, market_data_snapshot,
                                    notification_sent, notification_channels_used, notification_status
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """,
                                (
                                    adv["id"],
                                    now,
                                    context.get("current_price"),
                                    context.get("change_pct") or context.get("value"),
                                    json.dumps(context),
                                    None,
                                    True,
                                    json.dumps(["whatsapp"]) if self.settings.enable_whatsapp else json.dumps([]),
                                    "sent",
                                ),
                            )
                            await conn.commit()
                        except Exception as e:
                            logger.warning(f"Failed to update advanced alert after trigger: {e}")
                except Exception as e:
                    error_msg = f"Error checking advanced alert: {e}"
                    logger.error(error_msg, exc_info=True)
                    cycle_stats["errors"].append(error_msg)
            self.stats.successful_cycles += 1
            
            cycle_duration = (datetime.now(timezone.utc) - cycle_start).total_seconds()
            cycle_stats["duration_seconds"] = cycle_duration
            cycle_stats["end_time"] = datetime.now(timezone.utc).isoformat()
            
            logger.info(
                f"Monitoring cycle completed: {cycle_stats['alerts_checked']} checked, "
                f"{cycle_stats['alerts_triggered']} triggered, "
                f"{len(cycle_stats['errors'])} errors, "
                f"{cycle_duration:.2f}s duration"
            )
            
            return cycle_stats
            
        except Exception as e:
            error_msg = f"Price monitoring cycle failed: {e}"
            logger.error(error_msg)
            self.stats.failed_cycles += 1
            self.stats.last_error = error_msg
            cycle_stats["error"] = error_msg
            cycle_stats["end_time"] = datetime.now(timezone.utc).isoformat()
            return cycle_stats
    
    async def _check_alert(self, alert: Dict[str, Any], cycle_stats: Dict[str, Any]) -> None:
        """Check a single alert against current market price"""
        try:
            # Check if alert is in cooldown period
            if await self._is_in_cooldown(alert):
                logger.debug(f"Alert {alert['id']} is in cooldown period")
                return
                
            # Fetch current price
            try:
                # Convert string asset_type to AssetType enum
                asset_type = AssetType.STOCK if alert['asset_type'] == 'stock' else AssetType.CRYPTO
                price_data = await self.price_service.get_price(
                    alert['asset_symbol'], 
                    asset_type
                )
                current_price = price_data.current_price
                
            except APIError as e:
                logger.warning(f"Failed to fetch price for {alert['asset_symbol']}: {e}")
                return
            
            # Check if condition is met
            triggered = False
            if alert['condition_type'] == ">=" and current_price >= alert['threshold_price']:
                triggered = True
            elif alert['condition_type'] == "<=" and current_price <= alert['threshold_price']:
                triggered = True
                
            if triggered:
                logger.info(
                    f"Alert triggered: {alert['asset_symbol']} {alert['condition_type']} "
                    f"{alert['threshold_price']}, current: {current_price}"
                )
                
                # Send WhatsApp notification
                await self._send_alert_notification(price_data, alert)
                
                # Update alert last triggered time
                await self._update_alert_after_trigger(alert)
                
                cycle_stats["alerts_triggered"] += 1
                cycle_stats["triggered_alerts"].append({
                    "alert_id": alert['id'],
                    "asset_symbol": alert['asset_symbol'],
                    "condition": f"{alert['condition_type']} {alert['threshold_price']}",
                    "current_price": current_price,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
                
        except Exception as e:
            logger.error(f"Error checking alert {alert['id']}: {e}")
            raise
    
    async def _is_in_cooldown(self, alert: Dict[str, Any]) -> bool:
        """Check if alert is in cooldown period"""
        if not alert['last_triggered']:
            return False
            
        # Get fresh settings to ensure we have the latest cooldown value
        from src.config.settings import get_settings
        fresh_settings = get_settings()
        cooldown_hours = fresh_settings.cooldown_hours
        logger.debug(f"Alert {alert['id']} cooldown check: using {cooldown_hours} hours")
        # Parse datetime string if needed
        last_triggered = alert['last_triggered']
        if isinstance(last_triggered, str):
            last_triggered = datetime.fromisoformat(last_triggered.replace('Z', '+00:00'))
        elif not isinstance(last_triggered, datetime):
            return False
            
        time_since_trigger = datetime.now(timezone.utc) - last_triggered
        return time_since_trigger.total_seconds() < (cooldown_hours * 3600)
    
    async def _send_alert_notification(self, price_data, alert_or_condition, target_price: Optional[float] = None, alert_id: Optional[int] = None) -> None:
        """Send WhatsApp notification for triggered alert.
        Supports both basic alerts (dict) and custom condition text for advanced alerts.
        """
        try:
            if not self.settings.enable_whatsapp:
                logger.info("WhatsApp notifications disabled")
                return
                
            if isinstance(alert_or_condition, dict):
                alert = alert_or_condition
                condition_str = f"{alert['condition_type']} ${alert['threshold_price']}"
                target = alert['threshold_price']
                aid = alert.get('id')
            else:
                condition_str = str(alert_or_condition)
                target = float(target_price) if target_price is not None else price_data.current_price
                aid = alert_id

            await self.whatsapp_service.send_price_alert(price_data, condition_str, target, alert_id=aid)
            
        except Exception as e:
            logger.error(f"Failed to send WhatsApp notification: {e}")
            # Don't re-raise - notification failure shouldn't stop monitoring
    
    async def _update_alert_after_trigger(self, alert: Dict[str, Any]) -> None:
        """Update alert after it has been triggered"""
        try:
            conn = await get_db_connection()
            
            # Update the alert's last_triggered timestamp
            now = datetime.now(timezone.utc).isoformat()
            try:
                await conn.execute(
                    "UPDATE alerts SET last_triggered = ? WHERE id = ?",
                    (now, alert['id'])
                )
                await conn.commit()
                logger.info(f"Updated alert {alert['id']} after trigger")
            except Exception as db_error:
                logger.error(f"Failed to update alert {alert['id']} in database: {db_error}")
                raise
                    
        except Exception as e:
            logger.error(f"Failed to update alert {alert['id']} after trigger: {e}")
    
    def _job_error_listener(self, event: JobExecutionEvent) -> None:
        """Handle scheduler job errors"""
        if event.exception:
            error_msg = f"Scheduled job error: {event.exception}"
            logger.error(error_msg)
            self.stats.last_error = error_msg
    
    def _job_success_listener(self, event: JobExecutionEvent) -> None:
        """Handle successful job execution"""
        if event.job_id == self._job_id:
            # Update next run time
            job = self.scheduler.get_job(self._job_id)
            if job and job.next_run_time:
                self.stats.next_run = job.next_run_time
                

# Global scheduler instance
monitoring_scheduler = MonitoringScheduler()
