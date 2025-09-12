"""
Advanced logging configuration with structured logging and rotation
"""

import os
import json
import logging
import logging.handlers
from datetime import datetime
from typing import Any, Dict, Optional
from pathlib import Path
import traceback
import uuid

from src.config.settings import get_settings


class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured JSON logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as structured JSON"""
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add correlation ID if available
        if hasattr(record, 'correlation_id'):
            log_data["correlation_id"] = record.correlation_id
            
        # Add request ID if available
        if hasattr(record, 'request_id'):
            log_data["request_id"] = record.request_id
            
        # Add extra context if available
        if hasattr(record, 'extra_context'):
            log_data["context"] = record.extra_context
            
        # Add performance metrics if available
        if hasattr(record, 'duration_ms'):
            log_data["duration_ms"] = record.duration_ms
            
        # Add error details for exceptions
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": traceback.format_exception(*record.exc_info)
            }
            
        return json.dumps(log_data, ensure_ascii=False)


class ContextFilter(logging.Filter):
    """Filter to add contextual information to log records"""
    
    def __init__(self, component: str = "price-monitor"):
        super().__init__()
        self.component = component
        
    def filter(self, record: logging.LogRecord) -> bool:
        """Add contextual information to log record"""
        record.component = self.component
        
        # Add correlation ID if not present
        if not hasattr(record, 'correlation_id'):
            record.correlation_id = str(uuid.uuid4())[:8]
            
        return True


class ApplicationLogger:
    """
    Centralized logging configuration and utilities
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.logger_cache = {}
        
    def setup_logging(self):
        """Configure application-wide logging"""
        # Ensure logs directory exists
        logs_dir = Path("logs")
        logs_dir.mkdir(exist_ok=True)
        
        # Clear any existing handlers
        root_logger = logging.getLogger()
        root_logger.handlers.clear()
        
        # Set root logger level
        log_level = getattr(logging, self.settings.log_level.upper(), logging.INFO)
        root_logger.setLevel(log_level)
        
        # Create formatters
        structured_formatter = StructuredFormatter()
        console_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # Console handler (human readable)
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(console_formatter)
        console_handler.setLevel(log_level)
        console_handler.addFilter(ContextFilter())
        
        # File handler for structured logs (JSON)
        structured_handler = logging.handlers.RotatingFileHandler(
            filename="logs/app-structured.log",
            maxBytes=50 * 1024 * 1024,  # 50MB
            backupCount=10,
            encoding='utf-8'
        )
        structured_handler.setFormatter(structured_formatter)
        structured_handler.setLevel(log_level)
        structured_handler.addFilter(ContextFilter())
        
        # File handler for application logs (human readable)
        app_handler = logging.handlers.RotatingFileHandler(
            filename="logs/app.log",
            maxBytes=20 * 1024 * 1024,  # 20MB
            backupCount=5,
            encoding='utf-8'
        )
        app_handler.setFormatter(console_formatter)
        app_handler.setLevel(log_level)
        app_handler.addFilter(ContextFilter())
        
        # Error-only handler for critical issues
        error_handler = logging.handlers.RotatingFileHandler(
            filename="logs/errors.log",
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
            encoding='utf-8'
        )
        error_handler.setFormatter(structured_formatter)
        error_handler.setLevel(logging.ERROR)
        error_handler.addFilter(ContextFilter())
        
        # Add handlers to root logger
        root_logger.addHandler(console_handler)
        root_logger.addHandler(structured_handler)
        root_logger.addHandler(app_handler)
        root_logger.addHandler(error_handler)
        
        # Set specific logger levels
        logging.getLogger("uvicorn").setLevel(logging.WARNING)
        logging.getLogger("fastapi").setLevel(logging.WARNING)
        logging.getLogger("httpx").setLevel(logging.WARNING)
        
        # Log setup completion
        logger = self.get_logger("logging_config")
        logger.info("Logging system initialized", extra={
            'extra_context': {
                'log_level': self.settings.log_level,
                'structured_logging': True,
                'rotation_enabled': True
            }
        })
    
    def get_logger(self, name: str) -> logging.Logger:
        """Get or create a logger with consistent configuration"""
        if name not in self.logger_cache:
            logger = logging.getLogger(name)
            self.logger_cache[name] = logger
        return self.logger_cache[name]
    
    def log_performance(self, logger_name: str, operation: str, duration_ms: float, **context):
        """Log performance metrics"""
        logger = self.get_logger(logger_name)
        logger.info(f"Performance: {operation}", extra={
            'duration_ms': duration_ms,
            'extra_context': {
                'operation': operation,
                **context
            }
        })
    
    def log_api_call(self, logger_name: str, api_name: str, endpoint: str, 
                    status_code: Optional[int] = None, duration_ms: Optional[float] = None, 
                    error: Optional[Exception] = None, **context):
        """Log external API calls with structured data"""
        logger = self.get_logger(logger_name)
        
        log_context = {
            'api_name': api_name,
            'endpoint': endpoint,
            'status_code': status_code,
            **context
        }
        
        if error:
            logger.error(f"API call failed: {api_name} {endpoint}", 
                        exc_info=error,
                        extra={
                            'duration_ms': duration_ms,
                            'extra_context': log_context
                        })
        else:
            level = logging.INFO if status_code and status_code < 400 else logging.WARNING
            logger.log(level, f"API call: {api_name} {endpoint}",
                      extra={
                          'duration_ms': duration_ms,
                          'extra_context': log_context
                      })
    
    def log_database_operation(self, logger_name: str, operation: str, table: str,
                              affected_rows: Optional[int] = None, duration_ms: Optional[float] = None,
                              error: Optional[Exception] = None, **context):
        """Log database operations with performance metrics"""
        logger = self.get_logger(logger_name)
        
        log_context = {
            'operation': operation,
            'table': table,
            'affected_rows': affected_rows,
            **context
        }
        
        if error:
            logger.error(f"Database operation failed: {operation} on {table}",
                        exc_info=error,
                        extra={
                            'duration_ms': duration_ms,
                            'extra_context': log_context
                        })
        else:
            logger.info(f"Database operation: {operation} on {table}",
                       extra={
                           'duration_ms': duration_ms,
                           'extra_context': log_context
                       })
    
    def log_notification_attempt(self, logger_name: str, notification_type: str, 
                                recipient: str, success: bool, message_id: Optional[str] = None,
                                error: Optional[Exception] = None, retry_attempt: int = 0, **context):
        """Log notification delivery attempts"""
        logger = self.get_logger(logger_name)
        
        log_context = {
            'notification_type': notification_type,
            'recipient': recipient,
            'success': success,
            'message_id': message_id,
            'retry_attempt': retry_attempt,
            **context
        }
        
        if error:
            logger.error(f"Notification failed: {notification_type} to {recipient}",
                        exc_info=error,
                        extra={'extra_context': log_context})
        else:
            status = "delivered" if success else "failed"
            logger.info(f"Notification {status}: {notification_type} to {recipient}",
                       extra={'extra_context': log_context})
    
    def cleanup_old_logs(self, max_age_days: int = 30):
        """Clean up log files older than specified days"""
        logger = self.get_logger("logging_config")
        logs_dir = Path("logs")
        
        if not logs_dir.exists():
            return
            
        cleaned_count = 0
        total_size_freed = 0
        
        for log_file in logs_dir.glob("*.log*"):
            try:
                file_age = datetime.now() - datetime.fromtimestamp(log_file.stat().st_mtime)
                if file_age.days > max_age_days:
                    file_size = log_file.stat().st_size
                    log_file.unlink()
                    cleaned_count += 1
                    total_size_freed += file_size
                    
            except Exception as e:
                logger.warning(f"Failed to clean up log file {log_file}: {e}")
        
        if cleaned_count > 0:
            logger.info(f"Log cleanup completed: {cleaned_count} files removed, "
                       f"{total_size_freed / 1024 / 1024:.2f}MB freed")


# Global application logger instance
app_logger = ApplicationLogger()


def setup_application_logging():
    """Initialize application logging - call this once at startup"""
    app_logger.setup_logging()


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with proper configuration"""
    return app_logger.get_logger(name)


def log_performance(operation: str, duration_ms: float, logger_name: str = "performance", **context):
    """Convenience function for logging performance metrics"""
    app_logger.log_performance(logger_name, operation, duration_ms, **context)


def log_api_call(api_name: str, endpoint: str, logger_name: str = "api",
                status_code: Optional[int] = None, duration_ms: Optional[float] = None,
                error: Optional[Exception] = None, **context):
    """Convenience function for logging API calls"""
    app_logger.log_api_call(logger_name, api_name, endpoint, status_code, duration_ms, error, **context)


def log_database_operation(operation: str, table: str, logger_name: str = "database",
                          affected_rows: Optional[int] = None, duration_ms: Optional[float] = None,
                          error: Optional[Exception] = None, **context):
    """Convenience function for logging database operations"""
    app_logger.log_database_operation(logger_name, operation, table, affected_rows, duration_ms, error, **context)


def log_notification_attempt(notification_type: str, recipient: str, success: bool,
                           logger_name: str = "notifications", message_id: Optional[str] = None,
                           error: Optional[Exception] = None, retry_attempt: int = 0, **context):
    """Convenience function for logging notification attempts"""
    app_logger.log_notification_attempt(logger_name, notification_type, recipient, success,
                                      message_id, error, retry_attempt, **context)