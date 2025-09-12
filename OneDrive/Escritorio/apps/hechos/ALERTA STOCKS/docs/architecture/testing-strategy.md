# Testing Strategy

## Testing Pyramid
```
        E2E Tests (Manual)
       /                \
    Integration Tests (pytest)
   /                        \
Unit Tests (pytest)    API Tests (pytest)
```

## Test Organization

### Backend Tests
```
tests/
├── unit/
│   ├── test_alert_service.py    # Alert business logic
│   ├── test_price_service.py    # Price monitoring logic
│   └── test_whatsapp_service.py # Notification logic
├── integration/
│   ├── test_database.py         # Database operations
│   └── test_external_apis.py    # API integrations (mocked)
└── api/
    ├── test_web_routes.py       # HTML endpoints
    └── test_api_routes.py       # JSON endpoints
```

## Test Examples

### Backend API Test
```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_create_alert():
    alert_data = {
        "asset_symbol": "AAPL",
        "asset_type": "stock", 
        "condition_type": ">=",
        "threshold_price": 150.0
    }
    response = client.post("/api/alerts", json=alert_data)
    assert response.status_code == 201
    assert response.json()["asset_symbol"] == "AAPL"

def test_get_alerts():
    response = client.get("/api/alerts")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```
