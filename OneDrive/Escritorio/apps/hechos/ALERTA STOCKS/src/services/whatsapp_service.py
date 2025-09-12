import logging
from datetime import datetime
from typing import Optional, Dict, Any
import time
from twilio.rest import Client
from twilio.base.exceptions import TwilioException

from ..config.settings import settings
from ..models.price_data import PriceData
from ..utils.logging_config import get_logger, log_notification_attempt
from ..utils.database import get_database

logger = get_logger(__name__)


class WhatsAppNotification:
    """Model for WhatsApp notification data."""
    
    def __init__(
        self, 
        asset_symbol: str, 
        current_price: float, 
        condition: str, 
        target_price: float,
        message_id: Optional[str] = None,
        sent_at: Optional[datetime] = None,
        status: str = "pending"
    ):
        self.asset_symbol = asset_symbol
        self.current_price = current_price
        self.condition = condition
        self.target_price = target_price
        self.message_id = message_id
        self.sent_at = sent_at
        self.status = status


class WhatsAppError(Exception):
    """Custom exception for WhatsApp service errors."""
    
    def __init__(self, message: str, error_code: Optional[str] = None, original_error: Optional[Exception] = None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.original_error = original_error


class WhatsAppService:
    """Service for sending WhatsApp notifications via Twilio."""
    
    def __init__(self):
        self.account_sid = settings.twilio_account_sid
        self.auth_token = settings.twilio_auth_token
        self.whatsapp_number = settings.whatsapp_number
        # FROM number (Twilio WhatsApp sandbox or your number in prod)
        self.from_whatsapp = settings.twilio_from_number or "whatsapp:+14155238886"
        if not self.from_whatsapp.startswith("whatsapp:"):
            self.from_whatsapp = "whatsapp:" + self.from_whatsapp
        self.client = None
        
        if self.account_sid and self.auth_token:
            try:
                self.client = Client(self.account_sid, self.auth_token)
                logger.info("Twilio WhatsApp client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
                raise WhatsAppError("Failed to initialize Twilio client", original_error=e)
        else:
            logger.warning("Twilio credentials not configured - WhatsApp service disabled")
    
    def is_configured(self) -> bool:
        """Check if WhatsApp service is properly configured."""
        return (
            bool(self.account_sid) and 
            bool(self.auth_token) and 
            bool(self.whatsapp_number) and 
            self.client is not None
        )
    
    async def send_price_alert(
        self, 
        price_data: PriceData, 
        condition: str, 
        target_price: float,
        alert_id: Optional[int] = None,
        to_number: Optional[str] = None
    ) -> WhatsAppNotification:
        """
        Send a price alert notification via WhatsApp.
        
        Args:
            price_data: Current price information
            condition: Alert condition that was triggered (e.g., ">= $150")
            target_price: The target price that was set
            alert_id: Optional alert ID for database tracking
            to_number: Optional recipient number (uses default if not provided)
            
        Returns:
            WhatsAppNotification object with delivery information
            
        Raises:
            WhatsAppError: If message sending fails
        """
        start_time = time.time()
        
        if not self.is_configured():
            raise WhatsAppError("WhatsApp service not configured")
        
        recipient = to_number or self.whatsapp_number
        if not recipient:
            raise WhatsAppError("No recipient number configured")
        
        # Format the notification message
        message = self._format_price_alert_message(price_data, condition, target_price)
        
        # Create notification object
        notification = WhatsAppNotification(
            asset_symbol=price_data.symbol,
            current_price=price_data.current_price,
            condition=condition,
            target_price=target_price,
            sent_at=datetime.now()
        )
        
        logger.info(f"Sending WhatsApp alert for {price_data.symbol} to {recipient}", extra={
            'extra_context': {
                'symbol': price_data.symbol,
                'current_price': price_data.current_price,
                'target_price': target_price,
                'condition': condition,
                'recipient': recipient,
                'alert_id': alert_id
            }
        })
        
        try:
            # Send message with retry logic
            message_result = await self._send_message_with_retry(message, recipient)
            
            # Update notification with success details
            notification.message_id = message_result.sid
            notification.status = message_result.status
            
            # Store notification attempt in database
            await self._store_notification_attempt(
                alert_id=alert_id,
                notification=notification,
                message=message,
                recipient=recipient,
                success=True
            )
            
            duration_ms = (time.time() - start_time) * 1000
            log_notification_attempt(
                "whatsapp", recipient, True, 
                message_id=message_result.sid,
                symbol=price_data.symbol,
                duration_ms=duration_ms
            )
            
            logger.info(f"WhatsApp message sent successfully", extra={
                'extra_context': {
                    'message_id': message_result.sid,
                    'status': message_result.status,
                    'symbol': price_data.symbol,
                    'recipient': recipient
                }
            })
            
            return notification
            
        except Exception as e:
            notification.status = "failed"
            duration_ms = (time.time() - start_time) * 1000
            
            # Store failed notification attempt in database
            await self._store_notification_attempt(
                alert_id=alert_id,
                notification=notification,
                message=message,
                recipient=recipient,
                success=False,
                error=e
            )
            
            log_notification_attempt(
                "whatsapp", recipient, False,
                error=e,
                symbol=price_data.symbol,
                duration_ms=duration_ms
            )
            
            logger.error(f"Failed to send WhatsApp message", exc_info=e, extra={
                'extra_context': {
                    'symbol': price_data.symbol,
                    'recipient': recipient,
                    'alert_id': alert_id
                }
            })
            raise WhatsAppError(f"Failed to send WhatsApp message: {str(e)}", original_error=e)
    
    async def _send_message_with_retry(self, message: str, to_number: str, max_retries: int = 1):
        """
        Send message with retry logic.
        
        Args:
            message: Message content
            to_number: Recipient number
            max_retries: Maximum number of retry attempts
            
        Returns:
            Twilio message result
            
        Raises:
            WhatsAppError: If all attempts fail
        """
        last_error = None
        
        for attempt in range(max_retries + 1):
            try:
                logger.debug(f"WhatsApp send attempt {attempt + 1}/{max_retries + 1}")
                
                # Ensure numbers are in WhatsApp format (with whatsapp: prefix)
                def _ensure_wp(x: str) -> str:
                    return x if x.startswith("whatsapp:") else "whatsapp:" + x

                from_number = _ensure_wp(self.from_whatsapp)
                to_formatted = _ensure_wp(to_number)
                
                message_result = self.client.messages.create(
                    body=message,
                    from_=from_number,
                    to=to_formatted
                )
                
                if attempt > 0:
                    logger.info(f"WhatsApp message sent successfully after {attempt} retries")
                
                return message_result
                
            except TwilioException as e:
                last_error = e
                logger.warning(f"WhatsApp attempt {attempt + 1} failed: {e}")
                
                # Don't retry for certain error types
                if hasattr(e, 'status') and e.status in [400, 401, 403]:  # Client errors
                    logger.error(f"Non-retryable Twilio error: {e}")
                    break
                
                if attempt < max_retries:
                    logger.info(f"Retrying WhatsApp message send...")
                    continue
            
            except Exception as e:
                last_error = e
                logger.warning(f"WhatsApp attempt {attempt + 1} failed with unexpected error: {e}")
                
                if attempt < max_retries:
                    logger.info(f"Retrying WhatsApp message send...")
                    continue
        
        # All attempts failed
        error_msg = f"WhatsApp message failed after {max_retries + 1} attempts"
        if last_error:
            error_msg += f": {str(last_error)}"
        
        raise WhatsAppError(error_msg, original_error=last_error)
    
    def _format_price_alert_message(self, price_data: PriceData, condition: str, target_price: float) -> str:
        """
        Format a price alert message for WhatsApp in Spanish.
        
        Args:
            price_data: Current price information
            condition: Alert condition that was triggered
            target_price: Target price that was set
            
        Returns:
            Formatted message string in Spanish
        """
        # Format price with appropriate number of decimal places
        if price_data.current_price >= 1:
            current_price_str = f"${price_data.current_price:.2f}"
        else:
            current_price_str = f"${price_data.current_price:.6f}"
        
        if target_price >= 1:
            target_price_str = f"${target_price:.2f}"
        else:
            target_price_str = f"${target_price:.6f}"
        
        # Format timestamp
        timestamp = price_data.timestamp.strftime("%H:%M:%S")
        date = price_data.timestamp.strftime("%d/%m/%Y")
        
        # Create the message in Spanish
        message = f"""🚨 *¡Alerta de Precio Activada!*

📈 Activo: *{price_data.symbol}*
💵 Precio actual: *{current_price_str}*
🎯 Objetivo: {condition} {target_price_str}
⏰ Hora: {timestamp} ({date})

✔️ La condición de tu alerta se cumplió."""
        
        return message
    
    async def _store_notification_attempt(
        self,
        notification: WhatsAppNotification,
        message: str,
        recipient: str,
        success: bool,
        alert_id: Optional[int] = None,
        error: Optional[Exception] = None,
        attempt_number: int = 1
    ):
        """Store notification attempt in database for tracking."""
        try:
            db = await get_database()
            
            await db.execute("""
                INSERT INTO notification_attempts (
                    alert_id, message_id, recipient, notification_type, asset_symbol,
                    current_price, target_price, condition_text, message_content,
                    status, error_message, attempt_number, sent_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                alert_id,
                notification.message_id,
                recipient,
                "whatsapp",
                notification.asset_symbol,
                notification.current_price,
                notification.target_price,
                notification.condition,
                message,
                notification.status,
                str(error) if error else None,
                attempt_number,
                notification.sent_at.isoformat()
            ))
            
            await db.commit()
            
        except Exception as e:
            logger.error(f"Failed to store notification attempt in database", exc_info=e, extra={
                'extra_context': {
                    'notification_type': 'whatsapp',
                    'recipient': recipient,
                    'symbol': notification.asset_symbol,
                    'success': success
                }
            })
    
    async def get_notification_history(self, limit: int = 50, asset_symbol: Optional[str] = None) -> list:
        """
        Get notification history from database.
        
        Args:
            limit: Maximum number of records to return
            asset_symbol: Optional filter by asset symbol
            
        Returns:
            List of notification attempts
        """
        try:
            db = await get_database()
            
            if asset_symbol:
                cursor = await db.execute("""
                    SELECT * FROM notification_attempts 
                    WHERE asset_symbol = ?
                    ORDER BY sent_at DESC
                    LIMIT ?
                """, (asset_symbol, limit))
            else:
                cursor = await db.execute("""
                    SELECT * FROM notification_attempts 
                    ORDER BY sent_at DESC
                    LIMIT ?
                """, (limit,))
            
            # Get column names before closing cursor
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            rows = await cursor.fetchall()
            await cursor.close()
            
            # Convert rows to dictionaries using column names
            result = []
            for row in rows:
                if hasattr(row, 'keys'):
                    # Row is already dict-like (has keys method)
                    result.append(dict(row))
                else:
                    # Row is a tuple, convert using cursor description
                    result.append(dict(zip(columns, row)))
            return result
            
        except Exception as e:
            logger.error(f"Failed to fetch notification history", exc_info=e)
            return []
    
    async def send_test_message(self, to_number: Optional[str] = None) -> WhatsAppNotification:
        """
        Send a test message to verify WhatsApp integration.
        
        Args:
            to_number: Optional recipient number
            
        Returns:
            WhatsAppNotification object
            
        Raises:
            WhatsAppError: If test message fails
        """
        if not self.is_configured():
            raise WhatsAppError("WhatsApp service not configured")
        
        recipient = to_number or self.whatsapp_number
        test_message = """✅ *WhatsApp Integration Test*

This is a test message from your Finance Monitor application.

If you received this message, WhatsApp notifications are working correctly! 🎉

_Test sent at: {}_""".format(datetime.now().strftime("%H:%M:%S on %m/%d/%Y"))
        
        logger.info(f"Sending WhatsApp test message to {recipient}")
        
        try:
            message_result = await self._send_message_with_retry(test_message, recipient)
            
            notification = WhatsAppNotification(
                asset_symbol="TEST",
                current_price=0.0,
                condition="test",
                target_price=0.0,
                message_id=message_result.sid,
                sent_at=datetime.now(),
                status=message_result.status
            )
            
            logger.info(f"Test message sent successfully. SID: {message_result.sid}")
            return notification
            
        except Exception as e:
            logger.error(f"Test message failed: {e}")
            raise WhatsAppError(f"Test message failed: {str(e)}", original_error=e)


# Global service instance
whatsapp_service = WhatsAppService()
