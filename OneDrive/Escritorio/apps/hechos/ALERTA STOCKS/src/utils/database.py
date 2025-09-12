"""
Database connection and initialization utilities
"""

import sqlite3
import asyncio
import logging
from pathlib import Path
from typing import Optional
import aiosqlite

from src.config.settings import get_settings

logger = logging.getLogger(__name__)

# Global database connection
_db_connection: Optional[aiosqlite.Connection] = None


async def get_db_connection() -> aiosqlite.Connection:
    """Get database connection (create if doesn't exist)"""
    global _db_connection
    
    if _db_connection is None:
        settings = get_settings()
        
        # Ensure database directory exists
        db_path = Path(settings.database_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Create connection with timeout
        logger.debug(f"Connecting to database: {settings.database_path}")
        _db_connection = await aiosqlite.connect(
            settings.database_path, 
            timeout=10.0  # Add 10 second timeout
        )
        
        logger.info(f"Database connection established: {settings.database_path}")
    
    return _db_connection


async def get_database():
    """Convenience function to get database connection"""
    return await get_db_connection()


async def close_db_connection():
    """Close database connection"""
    global _db_connection
    
    if _db_connection:
        await _db_connection.close()
        _db_connection = None
        logger.info("Database connection closed")


async def init_database():
    """Initialize database with required tables"""
    try:
        conn = await get_db_connection()
        
        # Create alerts table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_symbol VARCHAR(20) NOT NULL,
                asset_type VARCHAR(10) NOT NULL CHECK (asset_type IN ('stock', 'crypto')),
                condition_type VARCHAR(2) NOT NULL CHECK (condition_type IN ('>=', '<=')),
                threshold_price DECIMAL(15, 8) NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_triggered DATETIME NULL
            )
        """)
        
        # Create notification_attempts table for WhatsApp delivery tracking
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS notification_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_id INTEGER,
                message_id VARCHAR(100),
                recipient VARCHAR(50) NOT NULL,
                notification_type VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
                asset_symbol VARCHAR(20) NOT NULL,
                current_price DECIMAL(15, 8) NOT NULL,
                target_price DECIMAL(15, 8) NOT NULL,
                condition_text VARCHAR(50) NOT NULL,
                message_content TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                error_message TEXT NULL,
                attempt_number INTEGER NOT NULL DEFAULT 1,
                sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                delivered_at DATETIME NULL,
                FOREIGN KEY (alert_id) REFERENCES alerts (id)
            )
        """)
        
        # Create indexes for performance
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_alerts_asset_symbol ON alerts(asset_symbol)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_alerts_last_triggered ON alerts(last_triggered)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_alerts_asset_type ON alerts(asset_type)")
        
        # Create indexes for notification_attempts table
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_notification_attempts_alert_id ON notification_attempts(alert_id)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_notification_attempts_status ON notification_attempts(status)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_notification_attempts_sent_at ON notification_attempts(sent_at)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_notification_attempts_asset_symbol ON notification_attempts(asset_symbol)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_notification_attempts_message_id ON notification_attempts(message_id)")
        
        # Advanced alerts tables
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS advanced_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_symbol VARCHAR(50) NOT NULL,
                asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stock','crypto')),
                alert_type VARCHAR(50) NOT NULL,
                alert_name VARCHAR(200) NULL,
                conditions TEXT NOT NULL, -- JSON
                timeframe VARCHAR(10) NOT NULL,
                check_frequency_minutes INTEGER NOT NULL DEFAULT 5,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_triggered DATETIME NULL,
                last_checked DATETIME NULL,
                trigger_count INTEGER NOT NULL DEFAULT 0,
                notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                notification_channels TEXT NULL, -- JSON array
                max_triggers INTEGER NULL,
                expiry_date DATETIME NULL,
                description TEXT NULL,
                notes TEXT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS alert_trigger_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_id INTEGER NOT NULL,
                triggered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                trigger_price DECIMAL(15,8) NULL,
                trigger_value DECIMAL(15,8) NULL,
                trigger_conditions_met TEXT NULL, -- JSON
                market_data_snapshot TEXT NULL, -- JSON
                notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
                notification_channels_used TEXT NULL, -- JSON
                notification_status VARCHAR(50) NULL,
                FOREIGN KEY (alert_id) REFERENCES advanced_alerts(id)
            )
        """)
        # Indexes for advanced alerts
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_adv_alerts_active ON advanced_alerts(is_active)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_adv_alerts_type ON advanced_alerts(alert_type)")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_adv_alerts_symbol ON advanced_alerts(asset_symbol)")
        
        await conn.commit()
        logger.info("Database tables initialized successfully")
        
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise


async def check_database_health() -> bool:
    """Check if database is accessible and healthy"""
    try:
        conn = await get_db_connection()
        
        # Test query
        cursor = await conn.execute("SELECT COUNT(*) FROM alerts")
        count = await cursor.fetchone()
        await cursor.close()
        
        logger.debug(f"Database health check passed. Alerts count: {count[0]}")
        return True
        
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
