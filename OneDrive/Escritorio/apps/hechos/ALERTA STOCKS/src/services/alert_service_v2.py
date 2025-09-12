"""
Refactored Alert service following SOLID principles
Uses Repository pattern and Dependency Injection
"""

from typing import List, Optional
from datetime import datetime

from ..models.schemas import AlertCreate, AlertUpdate, AlertResponse, AlertStats
from ..repositories.alert_repository import AlertRepositoryInterface
from ..utils.logging_config import get_logger

logger = get_logger(__name__)


class AlertServiceV2:
    """
    Alert service following Single Responsibility Principle
    Handles only business logic, delegates data access to repository
    """
    
    def __init__(self, alert_repository: AlertRepositoryInterface):
        """Dependency Injection - depends on abstraction, not concrete implementation"""
        self.alert_repository = alert_repository
    
    async def create_alert(self, alert_data: AlertCreate) -> AlertResponse:
        """
        Create a new price alert
        
        Args:
            alert_data: AlertCreate schema with alert configuration
            
        Returns:
            AlertResponse: Created alert data
        """
        try:
            # Business logic validation
            self._validate_alert_data(alert_data)
            
            # Delegate to repository
            alert = await self.alert_repository.create(alert_data)
            
            # Transform to response schema
            return self._alert_to_response(alert)
            
        except Exception as e:
            logger.error("Failed to create alert", exc_info=e, extra={
                'extra_context': {
                    'symbol': alert_data.asset_symbol,
                    'operation': 'create_alert'
                }
            })
            raise
    
    async def get_all_alerts(self) -> List[AlertResponse]:
        """Get all alerts"""
        try:
            alerts = await self.alert_repository.find_all()
            return [self._alert_to_response(alert) for alert in alerts]
            
        except Exception as e:
            logger.error("Failed to get all alerts", exc_info=e)
            raise
    
    async def get_alert_by_id(self, alert_id: int) -> Optional[AlertResponse]:
        """Get alert by ID"""
        try:
            alert = await self.alert_repository.find_by_id(alert_id)
            return self._alert_to_response(alert) if alert else None
            
        except Exception as e:
            logger.error("Failed to get alert by ID", exc_info=e, extra={
                'extra_context': {'alert_id': alert_id}
            })
            raise
    
    async def get_active_alerts(self) -> List[AlertResponse]:
        """Get all active alerts"""
        try:
            alerts = await self.alert_repository.find_active()
            return [self._alert_to_response(alert) for alert in alerts]
            
        except Exception as e:
            logger.error("Failed to get active alerts", exc_info=e)
            raise
    
    async def update_alert(self, alert_id: int, update_data: AlertUpdate) -> Optional[AlertResponse]:
        """Update alert"""
        try:
            # Business logic validation
            self._validate_update_data(update_data)
            
            # Delegate to repository
            alert = await self.alert_repository.update(alert_id, update_data)
            
            return self._alert_to_response(alert) if alert else None
            
        except Exception as e:
            logger.error("Failed to update alert", exc_info=e, extra={
                'extra_context': {'alert_id': alert_id}
            })
            raise
    
    async def delete_alert(self, alert_id: int) -> bool:
        """Delete alert"""
        try:
            return await self.alert_repository.delete(alert_id)
            
        except Exception as e:
            logger.error("Failed to delete alert", exc_info=e, extra={
                'extra_context': {'alert_id': alert_id}
            })
            raise
    
    async def mark_alert_triggered(self, alert_id: int) -> bool:
        """Mark alert as triggered"""
        try:
            triggered_at = datetime.utcnow()
            return await self.alert_repository.update_last_triggered(alert_id, triggered_at)
            
        except Exception as e:
            logger.error("Failed to mark alert as triggered", exc_info=e, extra={
                'extra_context': {'alert_id': alert_id}
            })
            raise
    
    async def get_alert_stats(self) -> AlertStats:
        """Get alert statistics"""
        try:
            all_alerts = await self.alert_repository.find_all()
            active_alerts = [alert for alert in all_alerts if alert.is_active]
            
            return AlertStats(
                total_alerts=len(all_alerts),
                active_alerts=len(active_alerts),
                inactive_alerts=len(all_alerts) - len(active_alerts),
                triggered_today=len([
                    alert for alert in all_alerts 
                    if alert.last_triggered and 
                    alert.last_triggered.date() == datetime.utcnow().date()
                ])
            )
            
        except Exception as e:
            logger.error("Failed to get alert stats", exc_info=e)
            raise
    
    def _validate_alert_data(self, alert_data: AlertCreate) -> None:
        """Validate alert creation data - business logic"""
        if alert_data.threshold_price <= 0:
            raise ValueError("Threshold price must be positive")
        
        if not alert_data.asset_symbol or not alert_data.asset_symbol.strip():
            raise ValueError("Asset symbol is required")
        
        if alert_data.condition_type not in ['>=', '<=']:
            raise ValueError("Condition type must be '>=' or '<='")
    
    def _validate_update_data(self, update_data: AlertUpdate) -> None:
        """Validate alert update data - business logic"""
        if update_data.threshold_price is not None and update_data.threshold_price <= 0:
            raise ValueError("Threshold price must be positive")
        
        if update_data.condition_type is not None and update_data.condition_type not in ['>=', '<=']:
            raise ValueError("Condition type must be '>=' or '<='")
    
    def _alert_to_response(self, alert) -> AlertResponse:
        """Transform Alert model to AlertResponse schema"""
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