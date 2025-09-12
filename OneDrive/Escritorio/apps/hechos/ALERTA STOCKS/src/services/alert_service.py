"""
Alert service layer
Business logic for alert management
"""

import logging
from typing import List, Optional
from datetime import datetime
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.alert import Alert
from src.models.schemas import AlertCreate, AlertUpdate, AlertResponse, AlertStats
from src.utils.database import get_db_connection

logger = logging.getLogger(__name__)


class AlertService:
    """Service layer for alert management operations"""
    
    @staticmethod
    async def create_alert(alert_data: AlertCreate) -> AlertResponse:
        """
        Create a new price alert
        
        Args:
            alert_data: AlertCreate schema with alert configuration
            
        Returns:
            AlertResponse: Created alert data
            
        Raises:
            Exception: If alert creation fails
        """
        try:
            conn = await get_db_connection()
            
            # Create new alert instance
            alert = Alert(
                asset_symbol=alert_data.asset_symbol,
                asset_type=alert_data.asset_type,
                condition_type=alert_data.condition_type,
                threshold_price=alert_data.threshold_price,
                is_active=True,
                created_at=datetime.utcnow()
            )
            
            # Insert into database
            query = """
                INSERT INTO alerts (asset_symbol, asset_type, condition_type, threshold_price, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """
            cursor = await conn.execute(
                query,
                (alert.asset_symbol, alert.asset_type, alert.condition_type, 
                 alert.threshold_price, alert.is_active, alert.created_at)
            )
            
            alert.id = cursor.lastrowid
            await conn.commit()
            
            logger.info(f"Created new alert: {alert}")
            
            # Return as response schema
            return AlertResponse(
                id=alert.id,
                asset_symbol=alert.asset_symbol,
                asset_type=alert.asset_type,
                condition_type=alert.condition_type,
                threshold_price=alert.threshold_price,
                is_active=alert.is_active,
                created_at=alert.created_at,
                last_triggered=alert.last_triggered,
                is_in_cooldown=alert.is_in_cooldown,
                can_trigger=alert.can_trigger
            )
            
        except Exception as e:
            logger.error(f"Error creating alert: {e}")
            raise Exception(f"Failed to create alert: {str(e)}")
    
    @staticmethod
    async def get_all_alerts() -> List[AlertResponse]:
        """
        Get all alerts
        
        Returns:
            List[AlertResponse]: List of all alerts
        """
        try:
            conn = await get_db_connection()
            
            query = """
                SELECT id, asset_symbol, asset_type, condition_type, threshold_price, 
                       is_active, created_at, last_triggered
                FROM alerts
                ORDER BY created_at DESC
            """
            cursor = await conn.execute(query)
            rows = await cursor.fetchall()
            await cursor.close()
            
            alerts = []
            for row in rows:
                # Parse datetime fields if they are strings
                created_at = row[6]
                if isinstance(created_at, str):
                    try:
                        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    except ValueError:
                        created_at = datetime.utcnow()
                
                last_triggered = row[7] 
                if isinstance(last_triggered, str):
                    try:
                        last_triggered = datetime.fromisoformat(last_triggered.replace('Z', '+00:00'))
                    except ValueError:
                        last_triggered = None
                        
                alert = Alert(
                    id=row[0],
                    asset_symbol=row[1],
                    asset_type=row[2],
                    condition_type=row[3],
                    threshold_price=row[4],
                    is_active=bool(row[5]),
                    created_at=created_at,
                    last_triggered=last_triggered
                )
                
                alerts.append(AlertResponse(
                    id=alert.id,
                    asset_symbol=alert.asset_symbol,
                    asset_type=alert.asset_type,
                    condition_type=alert.condition_type,
                    threshold_price=alert.threshold_price,
                    is_active=alert.is_active,
                    created_at=alert.created_at,
                    last_triggered=alert.last_triggered,
                    is_in_cooldown=alert.is_in_cooldown,
                    can_trigger=alert.can_trigger
                ))
            
            logger.debug(f"Retrieved {len(alerts)} alerts")
            return alerts
            
        except Exception as e:
            logger.error(f"Error retrieving alerts: {e}")
            raise Exception(f"Failed to retrieve alerts: {str(e)}")
    
    @staticmethod
    async def get_active_alerts() -> List[AlertResponse]:
        """
        Get only active alerts
        
        Returns:
            List[AlertResponse]: List of active alerts
        """
        try:
            conn = await get_db_connection()
            
            query = """
                SELECT id, asset_symbol, asset_type, condition_type, threshold_price, 
                       is_active, created_at, last_triggered
                FROM alerts
                WHERE is_active = 1
                ORDER BY created_at DESC
            """
            cursor = await conn.execute(query)
            rows = await cursor.fetchall()
            await cursor.close()
            
            alerts = []
            for row in rows:
                # Parse datetime fields if they are strings
                created_at = row[6]
                if isinstance(created_at, str):
                    try:
                        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    except ValueError:
                        created_at = datetime.utcnow()
                
                last_triggered = row[7] 
                if isinstance(last_triggered, str):
                    try:
                        last_triggered = datetime.fromisoformat(last_triggered.replace('Z', '+00:00'))
                    except ValueError:
                        last_triggered = None
                        
                alert = Alert(
                    id=row[0],
                    asset_symbol=row[1],
                    asset_type=row[2],
                    condition_type=row[3],
                    threshold_price=row[4],
                    is_active=bool(row[5]),
                    created_at=created_at,
                    last_triggered=last_triggered
                )
                
                alerts.append(AlertResponse(
                    id=alert.id,
                    asset_symbol=alert.asset_symbol,
                    asset_type=alert.asset_type,
                    condition_type=alert.condition_type,
                    threshold_price=alert.threshold_price,
                    is_active=alert.is_active,
                    created_at=alert.created_at,
                    last_triggered=alert.last_triggered,
                    is_in_cooldown=alert.is_in_cooldown,
                    can_trigger=alert.can_trigger
                ))
            
            logger.debug(f"Retrieved {len(alerts)} active alerts")
            return alerts
            
        except Exception as e:
            logger.error(f"Error retrieving active alerts: {e}")
            raise Exception(f"Failed to retrieve active alerts: {str(e)}")
    
    @staticmethod
    async def get_alert_by_id(alert_id: int) -> Optional[AlertResponse]:
        """
        Get alert by ID
        
        Args:
            alert_id: Alert ID
            
        Returns:
            Optional[AlertResponse]: Alert data if found
        """
        try:
            conn = await get_db_connection()
            
            query = """
                SELECT id, asset_symbol, asset_type, condition_type, threshold_price, 
                       is_active, created_at, last_triggered
                FROM alerts
                WHERE id = ?
            """
            cursor = await conn.execute(query, (alert_id,))
            row = await cursor.fetchone()
            await cursor.close()
            
            if not row:
                return None
            
            # Parse datetime fields if they are strings
            created_at = row[6]
            if isinstance(created_at, str):
                try:
                    created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                except ValueError:
                    created_at = datetime.utcnow()
            
            last_triggered = row[7] 
            if isinstance(last_triggered, str):
                try:
                    last_triggered = datetime.fromisoformat(last_triggered.replace('Z', '+00:00'))
                except ValueError:
                    last_triggered = None
                    
            alert = Alert(
                id=row[0],
                asset_symbol=row[1],
                asset_type=row[2],
                condition_type=row[3],
                threshold_price=row[4],
                is_active=bool(row[5]),
                created_at=created_at,
                last_triggered=last_triggered
            )
            
            return AlertResponse(
                id=alert.id,
                asset_symbol=alert.asset_symbol,
                asset_type=alert.asset_type,
                condition_type=alert.condition_type,
                threshold_price=alert.threshold_price,
                is_active=alert.is_active,
                created_at=alert.created_at,
                last_triggered=alert.last_triggered,
                is_in_cooldown=alert.is_in_cooldown,
                can_trigger=alert.can_trigger
            )
            
        except Exception as e:
            logger.error(f"Error retrieving alert {alert_id}: {e}")
            raise Exception(f"Failed to retrieve alert: {str(e)}")
    
    @staticmethod
    async def update_alert(alert_id: int, alert_data: AlertUpdate) -> Optional[AlertResponse]:
        """
        Update an existing alert
        
        Args:
            alert_id: Alert ID to update
            alert_data: AlertUpdate schema with fields to update
            
        Returns:
            Optional[AlertResponse]: Updated alert data if successful
        """
        try:
            # Check if alert exists
            existing_alert = await AlertService.get_alert_by_id(alert_id)
            if not existing_alert:
                return None
            
            conn = await get_db_connection()
            
            # Build update query dynamically
            update_fields = []
            update_values = []
            
            if alert_data.asset_symbol is not None:
                update_fields.append("asset_symbol = ?")
                update_values.append(alert_data.asset_symbol)
            
            if alert_data.asset_type is not None:
                update_fields.append("asset_type = ?")
                update_values.append(alert_data.asset_type)
            
            if alert_data.condition_type is not None:
                update_fields.append("condition_type = ?")
                update_values.append(alert_data.condition_type)
            
            if alert_data.threshold_price is not None:
                update_fields.append("threshold_price = ?")
                update_values.append(alert_data.threshold_price)
            
            if alert_data.is_active is not None:
                update_fields.append("is_active = ?")
                update_values.append(alert_data.is_active)
            
            if not update_fields:
                # No fields to update, return existing alert
                return existing_alert
            
            update_values.append(alert_id)
            query = f"UPDATE alerts SET {', '.join(update_fields)} WHERE id = ?"
            
            await conn.execute(query, tuple(update_values))
            await conn.commit()
            
            logger.info(f"Updated alert {alert_id}")
            
            # Return updated alert
            return await AlertService.get_alert_by_id(alert_id)
            
        except Exception as e:
            logger.error(f"Error updating alert {alert_id}: {e}")
            raise Exception(f"Failed to update alert: {str(e)}")
    
    @staticmethod
    async def toggle_alert_status(alert_id: int) -> Optional[AlertResponse]:
        """
        Toggle alert active status
        
        Args:
            alert_id: Alert ID to toggle
            
        Returns:
            Optional[AlertResponse]: Updated alert data if successful
        """
        try:
            # Get current status
            alert = await AlertService.get_alert_by_id(alert_id)
            if not alert:
                return None
            
            # Toggle status
            new_status = not alert.is_active
            update_data = AlertUpdate(is_active=new_status)
            
            return await AlertService.update_alert(alert_id, update_data)
            
        except Exception as e:
            logger.error(f"Error toggling alert {alert_id}: {e}")
            raise Exception(f"Failed to toggle alert status: {str(e)}")
    
    @staticmethod
    async def delete_alert(alert_id: int) -> bool:
        """
        Delete an alert
        
        Args:
            alert_id: Alert ID to delete
            
        Returns:
            bool: True if deleted successfully
        """
        try:
            conn = await get_db_connection()
            
            # Check if alert exists first
            existing_alert = await AlertService.get_alert_by_id(alert_id)
            if not existing_alert:
                return False
            
            query = "DELETE FROM alerts WHERE id = ?"
            cursor = await conn.execute(query, (alert_id,))
            await conn.commit()
            
            deleted = cursor.rowcount > 0
            if deleted:
                logger.info(f"Deleted alert {alert_id}")
            
            return deleted
            
        except Exception as e:
            logger.error(f"Error deleting alert {alert_id}: {e}")
            raise Exception(f"Failed to delete alert: {str(e)}")
    
    @staticmethod
    async def get_alert_stats() -> AlertStats:
        """
        Get alert statistics
        
        Returns:
            AlertStats: Alert statistics
        """
        try:
            conn = await get_db_connection()
            
            # Get all stats in one query
            query = """
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive,
                    SUM(CASE WHEN asset_type = 'stock' THEN 1 ELSE 0 END) as stocks,
                    SUM(CASE WHEN asset_type = 'crypto' THEN 1 ELSE 0 END) as crypto
                FROM alerts
            """
            cursor = await conn.execute(query)
            row = await cursor.fetchone()
            await cursor.close()
            
            if not row:
                return AlertStats(
                    total_alerts=0,
                    active_alerts=0,
                    inactive_alerts=0,
                    stock_alerts=0,
                    crypto_alerts=0,
                    alerts_in_cooldown=0
                )
            
            # Count alerts in cooldown (this requires individual checks)
            active_alerts = await AlertService.get_active_alerts()
            alerts_in_cooldown = sum(1 for alert in active_alerts if alert.is_in_cooldown)
            
            return AlertStats(
                total_alerts=row[0] or 0,
                active_alerts=row[1] or 0,
                inactive_alerts=row[2] or 0,
                stock_alerts=row[3] or 0,
                crypto_alerts=row[4] or 0,
                alerts_in_cooldown=alerts_in_cooldown
            )
            
        except Exception as e:
            logger.error(f"Error getting alert stats: {e}")
            raise Exception(f"Failed to get alert statistics: {str(e)}")
    
    @staticmethod
    async def update_last_triggered(alert_id: int, triggered_at: Optional[datetime] = None) -> bool:
        """
        Update the last triggered timestamp for an alert
        
        Args:
            alert_id: Alert ID to update
            triggered_at: Timestamp when alert was triggered (defaults to now)
            
        Returns:
            bool: True if updated successfully
        """
        try:
            if triggered_at is None:
                triggered_at = datetime.utcnow()
            
            conn = await get_db_connection()
            
            query = "UPDATE alerts SET last_triggered = ? WHERE id = ?"
            cursor = await conn.execute(query, (triggered_at, alert_id))
            await conn.commit()
            
            updated = cursor.rowcount > 0
            if updated:
                logger.debug(f"Updated last_triggered for alert {alert_id}")
            
            return updated
            
        except Exception as e:
            logger.error(f"Error updating last_triggered for alert {alert_id}: {e}")
            raise Exception(f"Failed to update alert trigger time: {str(e)}")