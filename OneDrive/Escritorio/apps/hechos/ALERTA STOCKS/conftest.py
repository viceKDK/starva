"""
Pytest configuration and shared fixtures
"""

import pytest
import asyncio
from unittest.mock import patch, MagicMock


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_settings():
    """Mock settings for testing"""
    with patch('src.config.settings.get_settings') as mock:
        mock.return_value = MagicMock(
            database_path=":memory:",
            cooldown_hours=3,
            alpha_vantage_api_key="test_key",
            twilio_account_sid="test_sid",
            twilio_auth_token="test_token",
            twilio_phone_number="test_phone",
            user_phone_number="test_user_phone",
            check_interval_minutes=5,
            max_retries=3,
            request_timeout_seconds=30,
            log_level="DEBUG"
        )
        yield mock.return_value