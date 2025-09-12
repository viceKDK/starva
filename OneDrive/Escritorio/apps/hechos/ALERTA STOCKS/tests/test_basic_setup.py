"""
Tests for basic application setup - Story 1.1
"""

import pytest
import asyncio
import sqlite3
from pathlib import Path
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.config.settings import get_settings, ensure_directories
from src.utils.database import init_database, check_database_health, get_db_connection


class TestProjectSetup:
    """Test basic project setup functionality"""
    
    def test_settings_load(self):
        """Test that settings can be loaded"""
        settings = get_settings()
        assert settings is not None
        assert settings.host == "127.0.0.1"
        assert settings.port == 8000
        
    def test_ensure_directories(self):
        """Test that required directories are created"""
        ensure_directories()
        
        # Check that directories exist
        assert Path("data").exists()
        assert Path("logs").exists()
        
    @pytest.mark.asyncio
    async def test_database_connection(self):
        """Test database connection and initialization"""
        # Ensure directories exist
        ensure_directories()
        
        # Initialize database
        await init_database()
        
        # Check database health
        health = await check_database_health()
        assert health is True
        
    @pytest.mark.asyncio
    async def test_database_tables(self):
        """Test that database tables are created correctly"""
        ensure_directories()
        await init_database()
        
        conn = await get_db_connection()
        
        # Check alerts table exists
        cursor = await conn.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='alerts'
        """)
        result = await cursor.fetchone()
        await cursor.close()
        
        assert result is not None
        assert result[0] == "alerts"
        
    def test_project_structure(self):
        """Test that project structure exists"""
        required_dirs = [
            "src", "src/routes", "src/services", "src/models", 
            "src/config", "src/utils", "templates", "static", 
            "static/css", "static/js", "tests"
        ]
        
        for dir_path in required_dirs:
            assert Path(dir_path).exists(), f"Directory {dir_path} should exist"
            
    def test_required_files(self):
        """Test that required files exist"""
        required_files = [
            "main.py",
            "requirements.txt", 
            ".env.example",
            ".gitignore",
            "src/config/settings.py",
            "src/utils/database.py",
            "templates/base.html",
            "templates/dashboard.html",
            "static/css/styles.css",
            "static/js/dashboard.js"
        ]
        
        for file_path in required_files:
            assert Path(file_path).exists(), f"File {file_path} should exist"