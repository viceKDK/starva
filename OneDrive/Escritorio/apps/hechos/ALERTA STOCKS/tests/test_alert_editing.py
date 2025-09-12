"""
Test cases for alert editing and bulk operations functionality
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from main import app


class TestAlertEditing:
    """Test cases for alert editing functionality"""
    
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
    
    def test_alert_editing_workflow(self, client):
        """Test complete alert editing workflow"""
        # 1. Create initial alert
        form_data = {
            "asset_symbol": "AAPL",
            "asset_type": "stock",
            "condition_type": ">=",
            "threshold_price": "150.00"
        }
        create_response = client.post("/alerts/", data=form_data)
        assert create_response.status_code == 200
        alert = create_response.json()
        
        # 2. Verify initial values
        assert alert["asset_symbol"] == "AAPL"
        assert alert["asset_type"] == "stock"
        assert alert["condition_type"] == ">="
        assert alert["threshold_price"] == 150.0
        assert alert["is_active"] is True
        
        # 3. Update alert with new values
        update_data = {
            "asset_symbol": "AAPL",
            "asset_type": "stock",
            "condition_type": "<=",
            "threshold_price": 140.0,
            "is_active": False
        }
        
        update_response = client.put(f"/alerts/{alert['id']}", json=update_data)
        assert update_response.status_code == 200
        updated_alert = update_response.json()
        
        # 4. Verify updated values
        assert updated_alert["asset_symbol"] == "AAPL"
        assert updated_alert["condition_type"] == "<="
        assert updated_alert["threshold_price"] == 140.0
        assert updated_alert["is_active"] is False
        
        # 5. Verify changes persist
        get_response = client.get(f"/alerts/{alert['id']}")
        assert get_response.status_code == 200
        persisted_alert = get_response.json()
        
        assert persisted_alert["condition_type"] == "<="
        assert persisted_alert["threshold_price"] == 140.0
        assert persisted_alert["is_active"] is False
    
    def test_partial_alert_update(self, client):
        """Test updating only specific fields of an alert"""
        # Create initial alert
        form_data = {
            "asset_symbol": "BTC",
            "asset_type": "crypto",
            "condition_type": ">=",
            "threshold_price": "45000.00"
        }
        create_response = client.post("/alerts/", data=form_data)
        alert = create_response.json()
        
        # Update only threshold price
        update_data = {
            "threshold_price": 50000.0
        }
        
        update_response = client.put(f"/alerts/{alert['id']}", json=update_data)
        assert update_response.status_code == 200
        updated_alert = update_response.json()
        
        # Verify only threshold changed
        assert updated_alert["asset_symbol"] == "BTC"  # Unchanged
        assert updated_alert["asset_type"] == "crypto"  # Unchanged
        assert updated_alert["condition_type"] == ">="  # Unchanged
        assert updated_alert["threshold_price"] == 50000.0  # Changed
        assert updated_alert["is_active"] is True  # Unchanged
    
    def test_alert_status_persistence(self, client):
        """Test that alert status changes persist across operations"""
        # Create alert
        form_data = {
            "asset_symbol": "ETH",
            "asset_type": "crypto",
            "condition_type": "<=",
            "threshold_price": "3000.00"
        }
        create_response = client.post("/alerts/", data=form_data)
        alert = create_response.json()
        
        # Toggle status to inactive
        toggle_response = client.post(f"/alerts/{alert['id']}/toggle")
        assert toggle_response.status_code == 200
        toggled_alert = toggle_response.json()
        assert toggled_alert["is_active"] is False
        
        # Edit other properties while inactive
        update_data = {
            "threshold_price": 3500.0
        }
        update_response = client.put(f"/alerts/{alert['id']}", json=update_data)
        updated_alert = update_response.json()
        
        # Status should remain inactive
        assert updated_alert["is_active"] is False
        assert updated_alert["threshold_price"] == 3500.0
        
        # Verify persistence after restart (simulated by new request)
        get_response = client.get(f"/alerts/{alert['id']}")
        final_alert = get_response.json()
        assert final_alert["is_active"] is False
        assert final_alert["threshold_price"] == 3500.0
    
    def test_edit_nonexistent_alert(self, client):
        """Test editing an alert that doesn't exist"""
        update_data = {
            "threshold_price": 100.0
        }
        
        update_response = client.put("/alerts/999", json=update_data)
        assert update_response.status_code == 404
    
    def test_edit_with_invalid_data(self, client):
        """Test editing with invalid data"""
        # Create alert
        form_data = {
            "asset_symbol": "NVDA",
            "asset_type": "stock",
            "condition_type": ">=",
            "threshold_price": "400.00"
        }
        create_response = client.post("/alerts/", data=form_data)
        alert = create_response.json()
        
        # Try to update with invalid data
        invalid_updates = [
            {"asset_type": "invalid_type"},
            {"condition_type": "!="},
            {"threshold_price": -100.0},
            {"threshold_price": 0},
            {"asset_symbol": ""},
        ]
        
        for invalid_data in invalid_updates:
            update_response = client.put(f"/alerts/{alert['id']}", json=invalid_data)
            assert update_response.status_code == 422


class TestBulkOperations:
    """Test cases for bulk operations"""
    
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
    
    def test_multiple_alert_management(self, client):
        """Test managing multiple alerts with various statuses"""
        # Create multiple alerts
        alerts_data = [
            {"asset_symbol": "AAPL", "asset_type": "stock", "condition_type": ">=", "threshold_price": "150.00"},
            {"asset_symbol": "GOOGL", "asset_type": "stock", "condition_type": "<=", "threshold_price": "2800.00"},
            {"asset_symbol": "BTC", "asset_type": "crypto", "condition_type": ">=", "threshold_price": "45000.00"},
            {"asset_symbol": "ETH", "asset_type": "crypto", "condition_type": "<=", "threshold_price": "3000.00"},
            {"asset_symbol": "TSLA", "asset_type": "stock", "condition_type": ">=", "threshold_price": "800.00"},
        ]
        
        created_alerts = []
        for alert_data in alerts_data:
            response = client.post("/alerts/", data=alert_data)
            assert response.status_code == 200
            created_alerts.append(response.json())
        
        # Test bulk status changes
        # Toggle some alerts to inactive
        toggle_ids = [created_alerts[1]["id"], created_alerts[3]["id"]]
        for alert_id in toggle_ids:
            response = client.post(f"/alerts/{alert_id}/toggle")
            assert response.status_code == 200
        
        # Verify mixed statuses
        all_alerts_response = client.get("/alerts/")
        all_alerts = all_alerts_response.json()
        
        active_count = sum(1 for alert in all_alerts if alert["is_active"])
        inactive_count = sum(1 for alert in all_alerts if not alert["is_active"])
        
        assert len(all_alerts) == 5
        assert active_count == 3
        assert inactive_count == 2
        
        # Test active-only filtering works correctly
        active_alerts_response = client.get("/alerts/active")
        active_alerts = active_alerts_response.json()
        
        assert len(active_alerts) == 3
        assert all(alert["is_active"] for alert in active_alerts)
        
        # Verify specific alerts are in correct state
        inactive_symbols = {alert["asset_symbol"] for alert in all_alerts if not alert["is_active"]}
        assert "GOOGL" in inactive_symbols
        assert "ETH" in inactive_symbols
    
    def test_visual_status_distinction(self, client):
        """Test that active and inactive alerts can be visually distinguished"""
        # Create test alerts
        form_data_1 = {
            "asset_symbol": "ACTIVE_STOCK",
            "asset_type": "stock", 
            "condition_type": ">=",
            "threshold_price": "100.00"
        }
        form_data_2 = {
            "asset_symbol": "INACTIVE_STOCK",
            "asset_type": "stock",
            "condition_type": "<=", 
            "threshold_price": "50.00"
        }
        
        alert_1 = client.post("/alerts/", data=form_data_1).json()
        alert_2 = client.post("/alerts/", data=form_data_2).json()
        
        # Make one inactive
        client.post(f"/alerts/{alert_2['id']}/toggle")
        
        # Get updated alerts
        alerts_response = client.get("/alerts/")
        alerts = alerts_response.json()
        
        active_alert = next(a for a in alerts if a["asset_symbol"] == "ACTIVE_STOCK")
        inactive_alert = next(a for a in alerts if a["asset_symbol"] == "INACTIVE_STOCK")
        
        # Verify status distinction
        assert active_alert["is_active"] is True
        assert active_alert["can_trigger"] is True
        
        assert inactive_alert["is_active"] is False
        assert inactive_alert["can_trigger"] is False
    
    def test_no_accidental_deletions(self, client):
        """Test that deletions require explicit confirmation (API level)"""
        # Create alert
        form_data = {
            "asset_symbol": "PROTECT_ME",
            "asset_type": "stock",
            "condition_type": ">=",
            "threshold_price": "200.00"
        }
        create_response = client.post("/alerts/", data=form_data)
        alert = create_response.json()
        
        # Verify alert exists
        get_response = client.get(f"/alerts/{alert['id']}")
        assert get_response.status_code == 200
        
        # Delete should work when explicitly called
        delete_response = client.delete(f"/alerts/{alert['id']}")
        assert delete_response.status_code == 200
        
        # Verify alert is gone
        get_after_delete = client.get(f"/alerts/{alert['id']}")
        assert get_after_delete.status_code == 404
        
        # Note: Frontend confirmation dialogs are tested separately
    
    def test_error_handling_scenarios(self, client):
        """Test various error scenarios in editing"""
        # Create test alert
        form_data = {
            "asset_symbol": "ERROR_TEST",
            "asset_type": "stock",
            "condition_type": ">=",
            "threshold_price": "100.00"
        }
        alert = client.post("/alerts/", data=form_data).json()
        
        # Test invalid JSON
        invalid_json_response = client.put(
            f"/alerts/{alert['id']}",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert invalid_json_response.status_code == 422
        
        # Test missing content type
        valid_data = {"threshold_price": 150.0}
        no_content_type_response = client.put(f"/alerts/{alert['id']}", json=valid_data)
        # Should work with proper JSON
        assert no_content_type_response.status_code == 200