"""
Test cases for alert routes
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from main import app
from src.models.schemas import AlertResponse


class TestAlertRoutes:
    """Test cases for alert API routes"""
    
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
    
    def test_create_alert_success(self, client):
        """Test successful alert creation"""
        form_data = {
            "asset_symbol": "AAPL",
            "asset_type": "stock",
            "condition_type": ">=",
            "threshold_price": "150.00"
        }
        
        response = client.post("/alerts/", data=form_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["asset_symbol"] == "AAPL"
        assert data["asset_type"] == "stock"
        assert data["condition_type"] == ">="
        assert data["threshold_price"] == 150.0
        assert data["is_active"] is True
        assert "id" in data
        assert "created_at" in data
    
    def test_create_alert_validation_error(self, client):
        """Test alert creation with invalid data"""
        form_data = {
            "asset_symbol": "",  # Empty symbol
            "asset_type": "stock",
            "condition_type": ">=",
            "threshold_price": "150.00"
        }
        
        response = client.post("/alerts/", data=form_data)
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_create_alert_invalid_asset_type(self, client):
        """Test alert creation with invalid asset type"""
        form_data = {
            "asset_symbol": "AAPL",
            "asset_type": "invalid",  # Invalid type
            "condition_type": ">=",
            "threshold_price": "150.00"
        }
        
        response = client.post("/alerts/", data=form_data)
        
        assert response.status_code == 422
    
    def test_create_alert_invalid_condition(self, client):
        """Test alert creation with invalid condition"""
        form_data = {
            "asset_symbol": "AAPL",
            "asset_type": "stock",
            "condition_type": "!=",  # Invalid condition
            "threshold_price": "150.00"
        }
        
        response = client.post("/alerts/", data=form_data)
        
        assert response.status_code == 422
    
    def test_create_alert_invalid_price(self, client):
        """Test alert creation with invalid price"""
        form_data = {
            "asset_symbol": "AAPL",
            "asset_type": "stock",
            "condition_type": ">=",
            "threshold_price": "-10.00"  # Negative price
        }
        
        response = client.post("/alerts/", data=form_data)
        
        assert response.status_code == 422
    
    def test_get_all_alerts_empty(self, client):
        """Test getting alerts when none exist"""
        response = client.get("/alerts/")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    def test_get_all_alerts_with_data(self, client):
        """Test getting alerts after creating some"""
        # Create an alert first
        form_data = {
            "asset_symbol": "AAPL",
            "asset_type": "stock",
            "condition_type": ">=",
            "threshold_price": "150.00"
        }
        client.post("/alerts/", data=form_data)
        
        # Get all alerts
        response = client.get("/alerts/")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["asset_symbol"] == "AAPL"
    
    def test_get_alert_by_id_success(self, client):
        """Test getting specific alert by ID"""
        # Create an alert first
        form_data = {
            "asset_symbol": "BTC",
            "asset_type": "crypto",
            "condition_type": "<=",
            "threshold_price": "45000.00"
        }
        create_response = client.post("/alerts/", data=form_data)
        alert_id = create_response.json()["id"]
        
        # Get alert by ID
        response = client.get(f"/alerts/{alert_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == alert_id
        assert data["asset_symbol"] == "BTC"
        assert data["asset_type"] == "crypto"
    
    def test_get_alert_by_id_not_found(self, client):
        """Test getting non-existent alert"""
        response = client.get("/alerts/999")
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
    
    def test_get_active_alerts(self, client):
        """Test getting only active alerts"""
        # Create an alert
        form_data = {
            "asset_symbol": "ETH",
            "asset_type": "crypto",
            "condition_type": ">=",
            "threshold_price": "3000.00"
        }
        client.post("/alerts/", data=form_data)
        
        # Get active alerts
        response = client.get("/alerts/active")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["is_active"] is True
    
    def test_get_alert_stats(self, client):
        """Test getting alert statistics"""
        # Create some alerts
        alerts_data = [
            {"asset_symbol": "AAPL", "asset_type": "stock", "condition_type": ">=", "threshold_price": "150.00"},
            {"asset_symbol": "GOOGL", "asset_type": "stock", "condition_type": "<=", "threshold_price": "2800.00"},
            {"asset_symbol": "BTC", "asset_type": "crypto", "condition_type": ">=", "threshold_price": "45000.00"}
        ]
        
        for alert_data in alerts_data:
            client.post("/alerts/", data=alert_data)
        
        # Get stats
        response = client.get("/alerts/stats")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_alerts"] == 3
        assert data["active_alerts"] == 3
        assert data["inactive_alerts"] == 0
        assert data["stock_alerts"] == 2
        assert data["crypto_alerts"] == 1
    
    def test_toggle_alert_status(self, client):
        """Test toggling alert status"""
        # Create an alert
        form_data = {
            "asset_symbol": "TSLA",
            "asset_type": "stock",
            "condition_type": ">=",
            "threshold_price": "800.00"
        }
        create_response = client.post("/alerts/", data=form_data)
        alert_id = create_response.json()["id"]
        
        # Toggle status (should become inactive)
        response = client.post(f"/alerts/{alert_id}/toggle")
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is False
        
        # Toggle again (should become active)
        response = client.post(f"/alerts/{alert_id}/toggle")
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is True
    
    def test_toggle_alert_not_found(self, client):
        """Test toggling non-existent alert"""
        response = client.post("/alerts/999/toggle")
        
        assert response.status_code == 404
    
    def test_delete_alert_success(self, client):
        """Test deleting an alert"""
        # Create an alert
        form_data = {
            "asset_symbol": "NVDA",
            "asset_type": "stock",
            "condition_type": "<=",
            "threshold_price": "400.00"
        }
        create_response = client.post("/alerts/", data=form_data)
        alert_id = create_response.json()["id"]
        
        # Delete alert
        response = client.delete(f"/alerts/{alert_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "deleted" in data["message"].lower()
        
        # Verify alert is gone
        get_response = client.get(f"/alerts/{alert_id}")
        assert get_response.status_code == 404
    
    def test_delete_alert_not_found(self, client):
        """Test deleting non-existent alert"""
        response = client.delete("/alerts/999")
        
        assert response.status_code == 404
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "price-monitor"
        assert data["version"] == "1.0.0"