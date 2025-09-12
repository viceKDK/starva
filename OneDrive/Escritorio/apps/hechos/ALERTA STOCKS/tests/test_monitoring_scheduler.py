"""
Test suite for monitoring scheduler service
"""

import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, Mock, patch, MagicMock

from src.services.monitoring_scheduler import MonitoringScheduler, MonitoringStats
from src.models.price_data import PriceData, APIError
from src.config.settings import get_settings


class TestMonitoringStats:
    """Test MonitoringStats class"""
    
    def test_stats_initialization(self):
        """Test stats initialization with default values"""
        stats = MonitoringStats()
        
        assert stats.last_run is None
        assert stats.next_run is None
        assert stats.total_cycles == 0
        assert stats.successful_cycles == 0
        assert stats.failed_cycles == 0
        assert stats.alerts_processed == 0
        assert stats.alerts_triggered == 0
        assert stats.last_error is None
        assert stats.is_running is False


class TestMonitoringScheduler:
    """Test MonitoringScheduler class"""
    
    @pytest.fixture
    def scheduler(self):
        """Create scheduler instance for testing"""
        return MonitoringScheduler()
    
    @pytest.fixture
    def mock_alert(self):
        """Create mock alert dictionary for testing"""
        return {
            'id': 1,
            'asset_symbol': 'AAPL',
            'asset_type': 'stock',
            'condition_type': '>=',
            'threshold_price': 150.0,
            'is_active': True,
            'last_triggered': None,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
    
    @pytest.fixture
    def mock_price_data(self):
        """Create mock price data for testing"""
        return PriceData(
            symbol="AAPL",
            current_price=160.0,
            timestamp=datetime.now(timezone.utc),
            source="test_api"
        )
    
    def test_scheduler_initialization(self, scheduler):
        """Test scheduler initializes correctly"""
        assert scheduler.scheduler is None
        assert scheduler.stats is not None
        assert isinstance(scheduler.stats, MonitoringStats)
        assert scheduler._job_id == "price_monitoring_job"
        assert scheduler.price_service is not None
        assert scheduler.whatsapp_service is not None
    
    @pytest.mark.asyncio
    async def test_get_status_when_not_running(self, scheduler):
        """Test get_status when scheduler is not running"""
        status = scheduler.get_status()
        
        assert status["is_running"] is False
        assert status["monitoring_interval_minutes"] == 5  # default from settings
        assert status["last_run"] is None
        assert status["next_run"] is None
        assert status["statistics"]["total_cycles"] == 0
        assert status["statistics"]["success_rate"] == 0
        assert status["last_error"] is None
    
    @pytest.mark.asyncio
    async def test_start_scheduler(self, scheduler):
        """Test starting the scheduler"""
        with patch('src.services.monitoring_scheduler.AsyncIOScheduler') as mock_scheduler_class:
            mock_scheduler = Mock()
            mock_scheduler.running = False
            mock_scheduler_class.return_value = mock_scheduler
            
            # Mock job
            mock_job = Mock()
            mock_job.next_run_time = datetime.now(timezone.utc)
            mock_scheduler.get_job.return_value = mock_job
            
            await scheduler.start()
            
            # Verify scheduler was configured correctly
            mock_scheduler_class.assert_called_once_with(timezone=timezone.utc)
            mock_scheduler.add_listener.assert_called()
            mock_scheduler.add_job.assert_called_once()
            mock_scheduler.start.assert_called_once()
            assert scheduler.stats.is_running is True
    
    @pytest.mark.asyncio
    async def test_start_scheduler_already_running(self, scheduler):
        """Test starting scheduler when already running"""
        with patch('src.services.monitoring_scheduler.AsyncIOScheduler') as mock_scheduler_class:
            mock_scheduler = Mock()
            mock_scheduler.running = True
            scheduler.scheduler = mock_scheduler
            
            await scheduler.start()
            
            # Should not create new scheduler
            mock_scheduler_class.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_stop_scheduler(self, scheduler):
        """Test stopping the scheduler"""
        mock_scheduler = Mock()
        mock_scheduler.running = True
        scheduler.scheduler = mock_scheduler
        scheduler.stats.is_running = True
        
        await scheduler.stop()
        
        mock_scheduler.shutdown.assert_called_once_with(wait=True)
        assert scheduler.stats.is_running is False
        assert scheduler.stats.next_run is None
    
    @pytest.mark.asyncio
    async def test_stop_scheduler_not_running(self, scheduler):
        """Test stopping scheduler when not running"""
        scheduler.scheduler = None
        
        await scheduler.stop()
        
        # Should not raise exception
    
    @pytest.mark.asyncio
    async def test_restart_scheduler(self, scheduler):
        """Test restarting the scheduler"""
        with patch.object(scheduler, 'stop', new_callable=AsyncMock) as mock_stop:
            with patch.object(scheduler, 'start', new_callable=AsyncMock) as mock_start:
                with patch('asyncio.sleep', new_callable=AsyncMock):
                    
                    await scheduler.restart()
                    
                    mock_stop.assert_called_once()
                    mock_start.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_update_interval_valid(self, scheduler):
        """Test updating monitoring interval with valid value"""
        with patch.object(scheduler, 'restart', new_callable=AsyncMock) as mock_restart:
            scheduler.scheduler = Mock()
            scheduler.scheduler.running = True
            
            await scheduler.update_interval(10)
            
            assert scheduler.settings.monitoring_interval_minutes == 10
            mock_restart.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_update_interval_invalid(self, scheduler):
        """Test updating monitoring interval with invalid value"""
        with pytest.raises(ValueError):
            await scheduler.update_interval(0)
        
        with pytest.raises(ValueError):
            await scheduler.update_interval(61)
    
    @pytest.mark.asyncio
    @patch('src.services.monitoring_scheduler.get_db_connection')
    async def test_price_monitoring_job_no_alerts(self, mock_get_connection, scheduler):
        """Test monitoring job when no active alerts exist"""
        # Mock database connection
        mock_conn = AsyncMock()
        mock_cursor = AsyncMock()
        mock_cursor.fetchall.return_value = []
        mock_conn.execute.return_value = mock_cursor
        mock_get_connection.return_value = mock_conn
        
        result = await scheduler._price_monitoring_job()
        
        assert result["alerts_checked"] == 0
        assert result["alerts_triggered"] == 0
        assert "message" in result
        assert scheduler.stats.successful_cycles == 1
    
    @pytest.mark.asyncio
    @patch('src.services.monitoring_scheduler.get_db_connection')
    async def test_price_monitoring_job_with_alerts(self, mock_get_connection, scheduler, mock_alert):
        """Test monitoring job with active alerts"""
        # Mock database connection with alert row
        alert_row = (
            mock_alert['id'], mock_alert['asset_symbol'], mock_alert['asset_type'],
            mock_alert['condition_type'], mock_alert['threshold_price'], 
            mock_alert['is_active'], mock_alert['created_at'], mock_alert['last_triggered']
        )
        
        mock_conn = AsyncMock()
        mock_cursor = AsyncMock()
        mock_cursor.fetchall.return_value = [alert_row]
        mock_conn.execute.return_value = mock_cursor
        mock_get_connection.return_value = mock_conn
        
        # Mock check_alert to not trigger
        with patch.object(scheduler, '_check_alert', new_callable=AsyncMock) as mock_check:
            result = await scheduler._price_monitoring_job()
            
            assert result["alerts_checked"] == 1
            assert result["alerts_triggered"] == 0
            # Verify the alert dict was created correctly
            call_args = mock_check.call_args[0]
            assert call_args[0]['asset_symbol'] == 'AAPL'
            assert scheduler.stats.successful_cycles == 1
    
    @pytest.mark.asyncio
    @patch('src.services.monitoring_scheduler.get_db_connection')
    async def test_price_monitoring_job_error(self, mock_get_connection, scheduler):
        """Test monitoring job handles database errors"""
        # Mock database connection to raise exception
        mock_get_connection.side_effect = Exception("Database error")
        
        result = await scheduler._price_monitoring_job()
        
        assert "error" in result
        assert scheduler.stats.failed_cycles == 1
        assert scheduler.stats.last_error is not None
    
    @pytest.mark.asyncio
    async def test_check_alert_in_cooldown(self, scheduler, mock_alert):
        """Test checking alert that is in cooldown"""
        mock_alert['last_triggered'] = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        
        with patch.object(scheduler, '_is_in_cooldown', return_value=True):
            cycle_stats = {"alerts_triggered": 0, "triggered_alerts": []}
            
            await scheduler._check_alert(mock_alert, cycle_stats)
            
            # Should not trigger
            assert cycle_stats["alerts_triggered"] == 0
    
    @pytest.mark.asyncio
    async def test_check_alert_price_fetch_error(self, scheduler, mock_alert):
        """Test checking alert when price fetch fails"""
        with patch.object(scheduler, '_is_in_cooldown', return_value=False):
            with patch.object(scheduler.price_service, 'get_price', side_effect=APIError("API error", "test_source")):
                cycle_stats = {"alerts_triggered": 0, "triggered_alerts": []}
                
                await scheduler._check_alert(mock_alert, cycle_stats)
                
                # Should not trigger
                assert cycle_stats["alerts_triggered"] == 0
    
    @pytest.mark.asyncio
    async def test_check_alert_triggered_condition_met(self, scheduler, mock_alert, mock_price_data):
        """Test checking alert when condition is met"""
        mock_alert['condition_type'] = ">="
        mock_alert['threshold_price'] = 150.0
        mock_price_data.current_price = 160.0  # Above threshold
        
        with patch.object(scheduler, '_is_in_cooldown', return_value=False):
            with patch.object(scheduler.price_service, 'get_price', return_value=mock_price_data):
                with patch.object(scheduler, '_send_alert_notification', new_callable=AsyncMock):
                    with patch.object(scheduler, '_update_alert_after_trigger', new_callable=AsyncMock):
                        cycle_stats = {"alerts_triggered": 0, "triggered_alerts": []}
                        
                        await scheduler._check_alert(mock_alert, cycle_stats)
                        
                        assert cycle_stats["alerts_triggered"] == 1
                        assert len(cycle_stats["triggered_alerts"]) == 1
    
    @pytest.mark.asyncio
    async def test_check_alert_condition_not_met(self, scheduler, mock_alert, mock_price_data):
        """Test checking alert when condition is not met"""
        mock_alert['condition_type'] = ">="
        mock_alert['threshold_price'] = 170.0
        mock_price_data.current_price = 160.0  # Below threshold
        
        with patch.object(scheduler, '_is_in_cooldown', return_value=False):
            with patch.object(scheduler.price_service, 'get_price', return_value=mock_price_data):
                cycle_stats = {"alerts_triggered": 0, "triggered_alerts": []}
                
                await scheduler._check_alert(mock_alert, cycle_stats)
                
                assert cycle_stats["alerts_triggered"] == 0
    
    @pytest.mark.asyncio
    async def test_is_in_cooldown_no_last_triggered(self, scheduler, mock_alert):
        """Test cooldown check when alert never triggered"""
        mock_alert['last_triggered'] = None
        
        result = await scheduler._is_in_cooldown(mock_alert)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_is_in_cooldown_within_period(self, scheduler, mock_alert):
        """Test cooldown check when within cooldown period"""
        mock_alert['last_triggered'] = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        
        with patch.object(scheduler.settings, 'cooldown_hours', 3):
            result = await scheduler._is_in_cooldown(mock_alert)
            
            assert result is True
    
    @pytest.mark.asyncio
    async def test_is_in_cooldown_outside_period(self, scheduler, mock_alert):
        """Test cooldown check when outside cooldown period"""
        mock_alert['last_triggered'] = (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()
        
        with patch.object(scheduler.settings, 'cooldown_hours', 3):
            result = await scheduler._is_in_cooldown(mock_alert)
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_send_alert_notification_disabled(self, scheduler, mock_alert):
        """Test sending notification when WhatsApp is disabled"""
        with patch.object(scheduler.settings, 'enable_whatsapp', False):
            await scheduler._send_alert_notification(mock_alert, 160.0)
            
            # Should not call WhatsApp service
    
    @pytest.mark.asyncio
    async def test_send_alert_notification_enabled(self, scheduler, mock_alert):
        """Test sending notification when WhatsApp is enabled"""
        with patch.object(scheduler.settings, 'enable_whatsapp', True):
            with patch.object(scheduler.whatsapp_service, 'send_price_alert', new_callable=AsyncMock) as mock_send:
                await scheduler._send_alert_notification(mock_alert, 160.0)
                
                mock_send.assert_called_once_with(
                    mock_alert['asset_symbol'],
                    mock_alert['asset_type'],
                    160.0,
                    mock_alert['condition_type'],
                    mock_alert['threshold_price']
                )
    
    @pytest.mark.asyncio
    async def test_send_alert_notification_error(self, scheduler, mock_alert):
        """Test sending notification handles errors gracefully"""
        with patch.object(scheduler.settings, 'enable_whatsapp', True):
            with patch.object(scheduler.whatsapp_service, 'send_price_alert', 
                            new_callable=AsyncMock, side_effect=Exception("Send failed")):
                # Should not raise exception
                await scheduler._send_alert_notification(mock_alert, 160.0)
    
    @pytest.mark.asyncio
    @patch('src.services.monitoring_scheduler.get_db_connection')
    async def test_update_alert_after_trigger(self, mock_get_connection, scheduler, mock_alert):
        """Test updating alert after trigger"""
        # Mock database connection
        mock_conn = AsyncMock()
        mock_get_connection.return_value = mock_conn
        
        await scheduler._update_alert_after_trigger(mock_alert)
        
        # Verify database was updated
        mock_conn.execute.assert_called_once()
        mock_conn.commit.assert_called_once()
        
        # Check the SQL query
        call_args = mock_conn.execute.call_args[0]
        assert "UPDATE alerts SET last_triggered" in call_args[0]
        assert call_args[1][1] == mock_alert['id']
    
    @pytest.mark.asyncio
    @patch('src.services.monitoring_scheduler.get_db_connection')
    async def test_update_alert_after_trigger_error(self, mock_get_connection, scheduler, mock_alert):
        """Test updating alert handles database errors gracefully"""
        # Mock database connection to raise exception
        mock_conn = AsyncMock()
        mock_conn.execute.side_effect = Exception("Database error")
        mock_get_connection.return_value = mock_conn
        
        # Should not raise exception
        await scheduler._update_alert_after_trigger(mock_alert)
    
    @pytest.mark.asyncio
    async def test_trigger_manual_check(self, scheduler):
        """Test triggering manual check"""
        with patch.object(scheduler, '_price_monitoring_job', new_callable=AsyncMock) as mock_job:
            mock_job.return_value = {"test": "result"}
            
            result = await scheduler.trigger_manual_check()
            
            assert result == {"test": "result"}
            mock_job.assert_called_once()
    
    def test_job_error_listener(self, scheduler):
        """Test job error event listener"""
        mock_event = Mock()
        mock_event.exception = Exception("Test error")
        
        scheduler._job_error_listener(mock_event)
        
        assert scheduler.stats.last_error == "Scheduled job error: Test error"
    
    def test_job_success_listener(self, scheduler):
        """Test job success event listener"""
        mock_event = Mock()
        mock_event.job_id = "price_monitoring_job"
        
        # Mock scheduler and job
        mock_job = Mock()
        mock_job.next_run_time = datetime.now(timezone.utc)
        mock_scheduler = Mock()
        mock_scheduler.get_job.return_value = mock_job
        scheduler.scheduler = mock_scheduler
        
        scheduler._job_success_listener(mock_event)
        
        # Should update next run time
        assert scheduler.stats.next_run is not None


class TestSchedulerIntegration:
    """Integration tests for scheduler functionality"""
    
    @pytest.mark.asyncio
    async def test_full_cycle_with_mocked_dependencies(self):
        """Test complete monitoring cycle with all dependencies mocked"""
        scheduler = MonitoringScheduler()
        
        # Create mock alert data
        mock_alert = {
            'id': 1,
            'asset_symbol': 'BTC',
            'asset_type': 'crypto',
            'condition_type': '<=',
            'threshold_price': 50000.0,
            'is_active': True,
            'last_triggered': None,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Create alert row tuple
        alert_row = (
            mock_alert['id'], mock_alert['asset_symbol'], mock_alert['asset_type'],
            mock_alert['condition_type'], mock_alert['threshold_price'], 
            mock_alert['is_active'], mock_alert['created_at'], mock_alert['last_triggered']
        )
        
        # Create mock price data (condition met)
        mock_price_data = PriceData(
            symbol="BTC",
            current_price=45000.0,  # Below threshold, should trigger
            timestamp=datetime.now(timezone.utc),
            source="test_api"
        )
        
        # Mock all dependencies
        with patch('src.services.monitoring_scheduler.get_db_connection') as mock_get_connection:
            with patch.object(scheduler.price_service, 'get_price', return_value=mock_price_data):
                with patch.object(scheduler.whatsapp_service, 'send_price_alert', new_callable=AsyncMock):
                    with patch.object(scheduler.settings, 'enable_whatsapp', True):
                        
                        # Setup database mock
                        mock_conn = AsyncMock()
                        mock_cursor = AsyncMock()
                        mock_cursor.fetchall.return_value = [alert_row]
                        mock_conn.execute.return_value = mock_cursor
                        mock_get_connection.return_value = mock_conn
                        
                        # Run monitoring job
                        result = await scheduler._price_monitoring_job()
                        
                        # Verify results
                        assert result["alerts_checked"] == 1
                        assert result["alerts_triggered"] == 1
                        assert len(result["triggered_alerts"]) == 1
                        assert result["triggered_alerts"][0]["asset_symbol"] == "BTC"
                        assert result["triggered_alerts"][0]["current_price"] == 45000.0
                        
                        # Verify stats updated
                        assert scheduler.stats.successful_cycles == 1
                        assert scheduler.stats.alerts_processed == 1
                        assert scheduler.stats.alerts_triggered == 1