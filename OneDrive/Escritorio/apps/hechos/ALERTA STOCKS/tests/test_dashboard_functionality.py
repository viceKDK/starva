"""
Test cases for dashboard functionality
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from main import app


class TestDashboardFunctionality:
    """Test cases for dashboard functionality"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        with patch('src.config.settings.get_settings') as mock_settings:
            mock_settings.return_value = MagicMock(
                database_path=":memory:",
                cooldown_hours=3,
                host="127.0.0.1",
                port=8000,
                debug=True,
                log_level="DEBUG"
            )
            return TestClient(app)
    
    def test_dashboard_page_loads(self, client):
        """Test main dashboard page loads correctly"""
        response = client.get("/")
        
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
        
        # Check for essential dashboard elements
        content = response.text
        assert "Price Alert Dashboard" in content
        assert "Create New Price Alert" in content
        assert "Your Price Alerts" in content
        assert "alerts-table" in content
        assert "alert-form" in content
    
    def test_complete_alert_workflow(self, client):
        """Test complete alert creation and management workflow"""
        # 1. Start with empty dashboard
        stats_response = client.get("/alerts/stats")
        assert stats_response.status_code == 200
        initial_stats = stats_response.json()
        assert initial_stats["total_alerts"] == 0
        
        # 2. Create first alert
        form_data_1 = {
            "asset_symbol": "AAPL",
            "asset_type": "stock",
            "condition_type": ">=",
            "threshold_price": "150.00"
        }
        create_response_1 = client.post("/alerts/", data=form_data_1)
        assert create_response_1.status_code == 200
        alert_1 = create_response_1.json()
        
        # 3. Create second alert
        form_data_2 = {
            "asset_symbol": "BTC",
            "asset_type": "crypto",
            "condition_type": "<=",
            "threshold_price": "45000.00"
        }
        create_response_2 = client.post("/alerts/", data=form_data_2)
        assert create_response_2.status_code == 200
        alert_2 = create_response_2.json()
        
        # 4. Verify stats updated correctly
        stats_response = client.get("/alerts/stats")
        stats = stats_response.json()
        assert stats["total_alerts"] == 2
        assert stats["active_alerts"] == 2
        assert stats["inactive_alerts"] == 0
        assert stats["stock_alerts"] == 1
        assert stats["crypto_alerts"] == 1
        
        # 5. Get all alerts and verify they're displayed correctly
        alerts_response = client.get("/alerts/")
        assert alerts_response.status_code == 200
        alerts = alerts_response.json()
        assert len(alerts) == 2
        
        # Verify alert details
        alert_symbols = [alert["asset_symbol"] for alert in alerts]
        assert "AAPL" in alert_symbols
        assert "BTC" in alert_symbols
        
        # 6. Toggle alert status
        toggle_response = client.post(f"/alerts/{alert_1['id']}/toggle")
        assert toggle_response.status_code == 200
        toggled_alert = toggle_response.json()
        assert toggled_alert["is_active"] is False
        
        # 7. Verify stats updated after toggle
        stats_response = client.get("/alerts/stats")
        stats = stats_response.json()
        assert stats["active_alerts"] == 1
        assert stats["inactive_alerts"] == 1
        
        # 8. Toggle back to active
        toggle_response = client.post(f"/alerts/{alert_1['id']}/toggle")
        assert toggle_response.status_code == 200
        toggled_alert = toggle_response.json()
        assert toggled_alert["is_active"] is True
        
        # 9. Delete one alert
        delete_response = client.delete(f"/alerts/{alert_2['id']}")
        assert delete_response.status_code == 200
        
        # 10. Verify alert is gone
        get_response = client.get(f"/alerts/{alert_2['id']}")
        assert get_response.status_code == 404
        
        # 11. Verify final stats
        stats_response = client.get("/alerts/stats")
        stats = stats_response.json()
        assert stats["total_alerts"] == 1
        assert stats["active_alerts"] == 1
        assert stats["crypto_alerts"] == 0
    
    def test_dashboard_with_mixed_alert_states(self, client):
        """Test dashboard displays correctly with mixed active/inactive alerts"""
        # Create multiple alerts
        alerts_data = [
            {"asset_symbol": "AAPL", "asset_type": "stock", "condition_type": ">=", "threshold_price": "150.00"},
            {"asset_symbol": "GOOGL", "asset_type": "stock", "condition_type": "<=", "threshold_price": "2800.00"},
            {"asset_symbol": "BTC", "asset_type": "crypto", "condition_type": ">=", "threshold_price": "45000.00"},
            {"asset_symbol": "ETH", "asset_type": "crypto", "condition_type": "<=", "threshold_price": "3000.00"},
        ]
        
        created_alerts = []
        for alert_data in alerts_data:
            response = client.post("/alerts/", data=alert_data)
            assert response.status_code == 200
            created_alerts.append(response.json())
        
        # Deactivate some alerts
        client.post(f"/alerts/{created_alerts[1]['id']}/toggle")  # GOOGL inactive
        client.post(f"/alerts/{created_alerts[3]['id']}/toggle")  # ETH inactive
        
        # Get final stats
        stats_response = client.get("/alerts/stats")
        stats = stats_response.json()
        
        assert stats["total_alerts"] == 4
        assert stats["active_alerts"] == 2
        assert stats["inactive_alerts"] == 2
        assert stats["stock_alerts"] == 2
        assert stats["crypto_alerts"] == 2
        
        # Verify alerts list includes both active and inactive
        alerts_response = client.get("/alerts/")
        alerts = alerts_response.json()
        
        active_count = sum(1 for alert in alerts if alert["is_active"])
        inactive_count = sum(1 for alert in alerts if not alert["is_active"])
        
        assert active_count == 2
        assert inactive_count == 2
        
        # Test active-only filter
        active_response = client.get("/alerts/active")
        active_alerts = active_response.json()
        assert len(active_alerts) == 2
        assert all(alert["is_active"] for alert in active_alerts)
    
    def test_error_handling_scenarios(self, client):
        """Test error handling in dashboard scenarios"""
        # Test toggle non-existent alert
        toggle_response = client.post("/alerts/999/toggle")
        assert toggle_response.status_code == 404
        
        # Test delete non-existent alert
        delete_response = client.delete("/alerts/999")
        assert delete_response.status_code == 404
        
        # Test get non-existent alert
        get_response = client.get("/alerts/999")
        assert get_response.status_code == 404
        
        # Test invalid alert creation
        invalid_form_data = {
            "asset_symbol": "",  # Empty symbol
            "asset_type": "invalid",  # Invalid type
            "condition_type": "!=",  # Invalid condition
            "threshold_price": "-100"  # Negative price
        }
        create_response = client.post("/alerts/", data=invalid_form_data)
        assert create_response.status_code == 422
    
    def test_empty_dashboard_state(self, client):
        """Test dashboard behavior when no alerts exist"""
        # Verify empty stats
        stats_response = client.get("/alerts/stats")
        stats = stats_response.json()
        
        assert stats["total_alerts"] == 0
        assert stats["active_alerts"] == 0
        assert stats["inactive_alerts"] == 0
        assert stats["stock_alerts"] == 0
        assert stats["crypto_alerts"] == 0
        
        # Verify empty alerts list
        alerts_response = client.get("/alerts/")
        alerts = alerts_response.json()
        assert alerts == []
        
        # Verify active alerts is empty
        active_response = client.get("/alerts/active")
        active_alerts = active_response.json()
        assert active_alerts == []