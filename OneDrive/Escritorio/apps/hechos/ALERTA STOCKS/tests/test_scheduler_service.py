import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
import asyncio

from src.services.scheduler_service import SchedulerService, SchedulerStats
from src.models.alert import Alert
from src.models.price_data import PriceData


class TestSchedulerStats:
    """Test cases for SchedulerStats."""
    
    def test_stats_initialization(self):
        """Test SchedulerStats initialization."""
        stats = SchedulerStats()
        
        assert stats.last_run is None
        assert stats.next_run is None
        assert stats.total_runs == 0
        assert stats.successful_runs == 0
        assert stats.failed_runs == 0
        assert stats.alerts_processed == 0
        assert stats.alerts_triggered == 0
        assert stats.last_error is None
        assert stats.running is False
    
    def test_stats_to_dict(self):
        """Test SchedulerStats to_dict conversion."""
        stats = SchedulerStats()
        stats.total_runs = 10
        stats.successful_runs = 8
        stats.failed_runs = 2
        stats.alerts_processed = 50
        stats.alerts_triggered = 5
        stats.running = True
        
        result = stats.to_dict()
        
        assert result["total_runs"] == 10
        assert result["successful_runs"] == 8
        assert result["failed_runs"] == 2
        assert result["alerts_processed"] == 50
        assert result["alerts_triggered"] == 5
        assert result["running"] is True
        assert result["success_rate"] == 80.0
    
    def test_stats_success_rate_zero_runs(self):
        """Test success rate calculation with zero runs."""
        stats = SchedulerStats()
        result = stats.to_dict()
        assert result["success_rate"] == 0.0


class TestSchedulerService:
    """Test cases for SchedulerService."""
    
    @pytest.fixture
    def service(self):
        return SchedulerService()
    
    @pytest.fixture
    def mock_alert(self):
        alert = Alert()
        alert.id = 1
        alert.asset_symbol = "AAPL"
        alert.asset_type = "stock"
        alert.condition_type = ">="
        alert.threshold_price = 150.0
        alert.is_active = True
        alert.created_at = datetime.now()
        alert.last_triggered = None
        return alert
    
    @pytest.fixture
    def mock_price_data(self):
        return PriceData(
            symbol="AAPL",
            current_price=155.0,
            timestamp=datetime.now(),
            source="alpha_vantage"
        )
    
    def test_service_initialization(self, service):
        """Test service initialization."""
        assert service.scheduler is not None
        assert service.stats is not None
        assert service.job_id == "price_monitoring_job"
        assert service._is_initialized is False
    
    @patch('src.services.scheduler_service.settings')
    def test_initialize_scheduler(self, mock_settings, service):
        """Test scheduler initialization."""
        mock_settings.monitoring_interval_minutes = 5
        
        service.initialize()
        
        assert service._is_initialized is True
        assert service.scheduler.get_job(service.job_id) is not None
    
    @patch('src.services.scheduler_service.settings')
    def test_initialize_already_initialized(self, mock_settings, service):
        """Test initializing already initialized scheduler."""
        mock_settings.monitoring_interval_minutes = 5
        
        service.initialize()
        service.initialize()  # Second call should be ignored
        
        assert service._is_initialized is True
    
    @patch('src.services.scheduler_service.settings')
    @pytest.mark.asyncio
    async def test_start_scheduler(self, mock_settings, service):
        """Test starting the scheduler."""
        mock_settings.monitoring_interval_minutes = 5
        
        await service.start()
        
        assert service.scheduler.running is True
        assert service.stats.running is True
    
    @patch('src.services.scheduler_service.settings')
    @pytest.mark.asyncio
    async def test_stop_scheduler(self, mock_settings, service):
        """Test stopping the scheduler."""
        mock_settings.monitoring_interval_minutes = 5
        
        await service.start()
        await service.stop()
        
        assert service.scheduler.running is False
        assert service.stats.running is False
        assert service.stats.next_run is None
    
    @patch('src.services.scheduler_service.settings')
    @pytest.mark.asyncio
    async def test_restart_scheduler(self, mock_settings, service):
        """Test restarting the scheduler."""
        mock_settings.monitoring_interval_minutes = 5
        
        await service.start()
        initial_stats = service.stats.total_runs
        
        await service.restart()
        
        assert service.scheduler.running is True
        assert service.stats.running is True
    
    @pytest.mark.asyncio
    async def test_trigger_manual_check_success(self, service):
        """Test successful manual check trigger."""
        with patch.object(service, '_price_monitoring_job') as mock_job:
            mock_job.return_value = {"alerts_processed": 5, "alerts_triggered": 2}
            
            result = await service.trigger_manual_check()
            
            assert result["success"] is True
            assert "completed successfully" in result["message"]
            assert result["result"]["alerts_processed"] == 5
            assert result["result"]["alerts_triggered"] == 2
    
    @pytest.mark.asyncio
    async def test_trigger_manual_check_failure(self, service):
        """Test manual check trigger failure."""
        with patch.object(service, '_price_monitoring_job') as mock_job:
            mock_job.side_effect = Exception("Test error")
            
            result = await service.trigger_manual_check()
            
            assert result["success"] is False
            assert "failed" in result["message"]
            assert result["result"] is None
    
    @patch('src.services.scheduler_service.settings')
    @pytest.mark.asyncio
    async def test_get_status(self, mock_settings, service):
        """Test getting scheduler status."""
        mock_settings.monitoring_interval_minutes = 5
        mock_settings.cooldown_hours = 3
        
        status = await service.get_status()
        
        assert "scheduler_running" in status
        assert "monitoring_interval_minutes" in status
        assert "cooldown_hours" in status
        assert status["monitoring_interval_minutes"] == 5
        assert status["cooldown_hours"] == 3
    
    @pytest.mark.asyncio
    async def test_get_triggerable_alerts(self, service):
        """Test fetching triggerable alerts."""
        mock_rows = [
            (1, "AAPL", "stock", ">=", 150.0, True, datetime.now(), None),
            (2, "TSLA", "stock", "<=", 200.0, True, datetime.now(), None)
        ]
        
        with patch('src.services.scheduler_service.get_db_connection') as mock_get_conn:
            mock_conn = AsyncMock()
            mock_result = AsyncMock()
            mock_result.fetchall.return_value = mock_rows
            mock_conn.execute.return_value = mock_result
            mock_get_conn.return_value = mock_conn
            
            alerts = await service._get_triggerable_alerts()
            
            assert len(alerts) == 2
            assert alerts[0].asset_symbol == "AAPL"
            assert alerts[1].asset_symbol == "TSLA"
    
    @pytest.mark.asyncio
    async def test_process_single_alert_triggered(self, service, mock_alert, mock_price_data):
        """Test processing a single alert that gets triggered."""
        # Mock price service
        with patch('src.services.scheduler_service.price_service') as mock_price_service:
            mock_price_service.get_price = AsyncMock(return_value=mock_price_data)
            
            # Mock WhatsApp service
            with patch.object(service, '_send_alert_notification') as mock_send:
                mock_send.return_value = None  # async function
                with patch.object(service, '_update_alert_triggered_time') as mock_update:
                    mock_update.return_value = None  # async function
                    
                    result = await service._process_single_alert(mock_alert)
                    
                    assert result is True
                    mock_send.assert_called_once()
                    mock_update.assert_called_once_with(mock_alert.id)
    
    @pytest.mark.asyncio
    async def test_process_single_alert_not_triggered(self, service, mock_alert):
        """Test processing a single alert that doesn't get triggered."""
        # Price below threshold
        low_price_data = PriceData(
            symbol="AAPL",
            current_price=140.0,  # Below threshold of 150.0
            timestamp=datetime.now(),
            source="alpha_vantage"
        )
        
        with patch('src.services.scheduler_service.price_service') as mock_price_service:
            mock_price_service.get_price = AsyncMock(return_value=low_price_data)
            
            result = await service._process_single_alert(mock_alert)
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_process_single_alert_price_fetch_error(self, service, mock_alert):
        """Test processing alert when price fetch fails."""
        with patch('src.services.scheduler_service.price_service') as mock_price_service:
            mock_price_service.get_price = AsyncMock(side_effect=Exception("Price fetch failed"))
            
            result = await service._process_single_alert(mock_alert)
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_send_alert_notification_success(self, service, mock_alert, mock_price_data):
        """Test successful alert notification sending."""
        with patch('src.services.scheduler_service.whatsapp_service') as mock_whatsapp:
            mock_notification = MagicMock()
            mock_notification.message_id = "test_message_id"
            mock_whatsapp.is_configured.return_value = True
            mock_whatsapp.send_price_alert.return_value = mock_notification
            
            await service._send_alert_notification(mock_alert, mock_price_data)
            
            mock_whatsapp.send_price_alert.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_send_alert_notification_not_configured(self, service, mock_alert, mock_price_data):
        """Test alert notification when WhatsApp is not configured."""
        with patch('src.services.scheduler_service.whatsapp_service') as mock_whatsapp:
            mock_whatsapp.is_configured.return_value = False
            
            # Should not raise exception
            await service._send_alert_notification(mock_alert, mock_price_data)
            
            mock_whatsapp.send_price_alert.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_send_alert_notification_failure(self, service, mock_alert, mock_price_data):
        """Test alert notification sending failure."""
        with patch('src.services.scheduler_service.whatsapp_service') as mock_whatsapp:
            mock_whatsapp.is_configured.return_value = True
            mock_whatsapp.send_price_alert.side_effect = Exception("Send failed")
            
            # Should not raise exception (logs error but continues)
            await service._send_alert_notification(mock_alert, mock_price_data)
    
    @pytest.mark.asyncio
    async def test_update_alert_triggered_time_success(self, service):
        """Test successful alert triggered time update."""
        with patch('src.services.scheduler_service.get_db_connection') as mock_get_conn:
            mock_conn = AsyncMock()
            mock_get_conn.return_value = mock_conn
            
            await service._update_alert_triggered_time(1)
            
            mock_conn.execute.assert_called_once()
            mock_conn.commit.assert_called_once()
            mock_conn.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_update_alert_triggered_time_failure(self, service):
        """Test alert triggered time update failure."""
        with patch('src.services.scheduler_service.get_db_connection') as mock_get_conn:
            mock_conn = AsyncMock()
            mock_conn.execute.side_effect = Exception("Database error")
            mock_get_conn.return_value = mock_conn
            
            # Should not raise exception (logs error but continues)
            await service._update_alert_triggered_time(1)
    
    @pytest.mark.asyncio
    async def test_price_monitoring_job_no_alerts(self, service):
        """Test price monitoring job with no active alerts."""
        with patch.object(service, '_get_triggerable_alerts') as mock_get_alerts:
            mock_get_alerts.return_value = []
            
            result = await service._price_monitoring_job()
            
            assert result["alerts_processed"] == 0
            assert result["alerts_triggered"] == 0
            assert "execution_time_seconds" in result
    
    @pytest.mark.asyncio
    async def test_price_monitoring_job_with_alerts(self, service, mock_alert):
        """Test price monitoring job with active alerts."""
        with patch.object(service, '_get_triggerable_alerts') as mock_get_alerts:
            mock_get_alerts.return_value = [mock_alert]
            
            with patch.object(service, '_process_single_alert') as mock_process:
                mock_process.return_value = True  # Alert triggered
                
                result = await service._price_monitoring_job()
                
                assert result["alerts_processed"] == 1
                assert result["alerts_triggered"] == 1
                assert "execution_time_seconds" in result
                
                # Check stats were updated
                assert service.stats.alerts_processed >= 1
                assert service.stats.alerts_triggered >= 1
    
    @pytest.mark.asyncio
    async def test_price_monitoring_job_with_processing_error(self, service, mock_alert):
        """Test price monitoring job with alert processing error."""
        with patch.object(service, '_get_triggerable_alerts') as mock_get_alerts:
            mock_get_alerts.return_value = [mock_alert]
            
            with patch.object(service, '_process_single_alert') as mock_process:
                mock_process.side_effect = Exception("Processing failed")
                
                result = await service._price_monitoring_job()
                
                # Should complete despite error
                assert result["alerts_processed"] == 0  # Error prevented processing
                assert result["alerts_triggered"] == 0
                assert "execution_time_seconds" in result
    
    def test_job_event_handlers(self, service):
        """Test scheduler job event handlers."""
        # Test successful job execution
        mock_event = MagicMock()
        service._on_job_executed(mock_event)
        
        assert service.stats.successful_runs == 1
        assert service.stats.last_run is not None
        assert service.stats.last_error is None
        
        # Test job error
        mock_error_event = MagicMock()
        mock_error_event.exception = Exception("Test error")
        service._on_job_error(mock_error_event)
        
        assert service.stats.failed_runs == 1
        assert service.stats.last_error == "Test error"