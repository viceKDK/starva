"""
Alert repository implementing Repository pattern
Follows Single Responsibility and Dependency Inversion principles
"""

from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime
import logging

from ..models.alert import Alert
from ..models.schemas import AlertCreate, AlertUpdate, AlertResponse
from ..utils.database import get_db_connection
from ..utils.logging_config import get_logger

logger = get_logger(__name__)


class AlertRepositoryInterface(ABC):
    """Abstract interface for alert data access operations"""
    
    @abstractmethod
    async def create(self, alert_data: AlertCreate) -> Alert:
        """Create a new alert"""
        pass
    
    @abstractmethod
    async def find_by_id(self, alert_id: int) -> Optional[Alert]:
        """Find alert by ID"""
        pass
    
    @abstractmethod
    async def find_all(self) -> List[Alert]:
        """Find all alerts"""
        pass
    
    @abstractmethod
    async def find_active(self) -> List[Alert]:
        """Find all active alerts"""
        pass
    
    @abstractmethod
    async def update(self, alert_id: int, update_data: AlertUpdate) -> Optional[Alert]:
        """Update alert"""
        pass
    
    @abstractmethod
    async def delete(self, alert_id: int) -> bool:
        """Delete alert"""
        pass
    
    @abstractmethod
    async def update_last_triggered(self, alert_id: int, triggered_at: datetime) -> bool:
        """Update last triggered timestamp"""
        pass


class SQLiteAlertRepository(AlertRepositoryInterface):
    """SQLite implementation of AlertRepository following SOLID principles"""
    
    async def create(self, alert_data: AlertCreate) -> Alert:
        """Create a new alert in database"""
        try:
            conn = await get_db_connection()
            
            # Create Alert instance
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
            
            logger.info("Alert created successfully", extra={
                'extra_context': {
                    'alert_id': alert.id,
                    'symbol': alert.asset_symbol,
                    'operation': 'create_alert'
                }
            })
            
            return alert
            
        except Exception as e:
            logger.error("Failed to create alert", exc_info=e, extra={
                'extra_context': {
                    'symbol': alert_data.asset_symbol,
                    'operation': 'create_alert'
                }
            })
            raise
    
    async def find_by_id(self, alert_id: int) -> Optional[Alert]:
        """Find alert by ID"""
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
            
            if row:
                return Alert(
                    id=row[0],
                    asset_symbol=row[1],
                    asset_type=row[2],
                    condition_type=row[3],
                    threshold_price=row[4],
                    is_active=bool(row[5]),
                    created_at=row[6],
                    last_triggered=row[7]
                )
            return None
            
        except Exception as e:
            logger.error("Failed to find alert by ID", exc_info=e, extra={
                'extra_context': {'alert_id': alert_id, 'operation': 'find_by_id'}
            })
            raise
    
    async def find_all(self) -> List[Alert]:
        """Find all alerts"""
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
            
            alerts = []
            for row in rows:
                alert = Alert(
                    id=row[0],
                    asset_symbol=row[1],
                    asset_type=row[2],
                    condition_type=row[3],
                    threshold_price=row[4],
                    is_active=bool(row[5]),
                    created_at=row[6],
                    last_triggered=row[7]
                )
                alerts.append(alert)
            
            return alerts
            
        except Exception as e:
            logger.error("Failed to find all alerts", exc_info=e, extra={
                'extra_context': {'operation': 'find_all'}
            })
            raise
    
    async def find_active(self) -> List[Alert]:
        """Find all active alerts"""
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
            
            alerts = []
            for row in rows:
                alert = Alert(
                    id=row[0],
                    asset_symbol=row[1],
                    asset_type=row[2],
                    condition_type=row[3],
                    threshold_price=row[4],
                    is_active=bool(row[5]),
                    created_at=row[6],
                    last_triggered=row[7]
                )
                alerts.append(alert)
            
            return alerts
            
        except Exception as e:
            logger.error("Failed to find active alerts", exc_info=e, extra={
                'extra_context': {'operation': 'find_active'}
            })
            raise
    
    async def update(self, alert_id: int, update_data: AlertUpdate) -> Optional[Alert]:
        """Update alert"""
        try:
            conn = await get_db_connection()
            
            # Build dynamic update query
            update_fields = []
            values = []
            
            if update_data.threshold_price is not None:
                update_fields.append("threshold_price = ?")
                values.append(update_data.threshold_price)
            
            if update_data.is_active is not None:
                update_fields.append("is_active = ?")
                values.append(update_data.is_active)
            
            if update_data.condition_type is not None:
                update_fields.append("condition_type = ?")
                values.append(update_data.condition_type)
            
            if not update_fields:
                return await self.find_by_id(alert_id)
            
            values.append(alert_id)
            
            query = f"""
                UPDATE alerts 
                SET {', '.join(update_fields)}
                WHERE id = ?
            """
            
            await conn.execute(query, values)
            await conn.commit()
            
            logger.info("Alert updated successfully", extra={
                'extra_context': {
                    'alert_id': alert_id,
                    'fields_updated': len(update_fields),
                    'operation': 'update_alert'
                }
            })
            
            return await self.find_by_id(alert_id)
            
        except Exception as e:
            logger.error("Failed to update alert", exc_info=e, extra={
                'extra_context': {'alert_id': alert_id, 'operation': 'update_alert'}
            })
            raise
    
    async def delete(self, alert_id: int) -> bool:
        """Delete alert"""
        try:
            conn = await get_db_connection()
            
            query = "DELETE FROM alerts WHERE id = ?"
            cursor = await conn.execute(query, (alert_id,))
            await conn.commit()
            
            deleted = cursor.rowcount > 0
            
            if deleted:
                logger.info("Alert deleted successfully", extra={
                    'extra_context': {'alert_id': alert_id, 'operation': 'delete_alert'}
                })
            else:
                logger.warning("Alert not found for deletion", extra={
                    'extra_context': {'alert_id': alert_id, 'operation': 'delete_alert'}
                })
            
            return deleted
            
        except Exception as e:
            logger.error("Failed to delete alert", exc_info=e, extra={
                'extra_context': {'alert_id': alert_id, 'operation': 'delete_alert'}
            })
            raise
    
    async def update_last_triggered(self, alert_id: int, triggered_at: datetime) -> bool:
        """Update last triggered timestamp"""
        try:
            conn = await get_db_connection()
            
            query = "UPDATE alerts SET last_triggered = ? WHERE id = ?"
            cursor = await conn.execute(query, (triggered_at, alert_id))
            await conn.commit()
            
            updated = cursor.rowcount > 0
            
            if updated:
                logger.info("Alert last_triggered updated", extra={
                    'extra_context': {
                        'alert_id': alert_id,
                        'triggered_at': triggered_at.isoformat(),
                        'operation': 'update_last_triggered'
                    }
                })
            
            return updated
            
        except Exception as e:
            logger.error("Failed to update last_triggered", exc_info=e, extra={
                'extra_context': {'alert_id': alert_id, 'operation': 'update_last_triggered'}
            })
            raise