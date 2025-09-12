# API Documentation - Price Monitor Application

This document provides comprehensive documentation for the Price Monitor application's REST API endpoints, including authentication, request/response formats, and error handling.

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Alert Management API](#alert-management-api)
- [Scheduler API](#scheduler-api)
- [Configuration API](#configuration-api)
- [Health Monitoring API](#health-monitoring-api)
- [Data Management API](#data-management-api)
- [WebSocket Endpoints](#websocket-endpoints)
- [SDK Examples](#sdk-examples)

## Overview

The Price Monitor API is a RESTful web service built with FastAPI that provides programmatic access to price monitoring, alert management, configuration, and system health features.

### API Features

- **Alert Management**: Create, read, update, delete price alerts
- **Real-time Monitoring**: Start/stop price monitoring scheduler
- **Configuration**: Manage application settings
- **Health Monitoring**: System health checks and metrics
- **Data Management**: Database operations, backups, and maintenance
- **WebSocket Support**: Real-time updates (planned)

### API Version

Current API Version: **v1**  
Documentation Version: **1.0**  
Last Updated: **2025-08-28**

## Base URL

All API endpoints are relative to the base URL:

```
http://localhost:8000
```

For production deployments, replace with your actual domain:
```
https://your-domain.com
```

## Authentication

Currently, the API **does not require authentication** as it's designed for local/personal use. The application should be configured to bind only to localhost (`127.0.0.1`) for security.

### Future Authentication (Planned)

For production deployments with public access, future versions may include:
- API key authentication
- JWT token-based authentication
- Role-based access control

## Response Format

All API responses follow a consistent JSON format:

### Successful Responses

```json
{
    "status": "success",
    "data": {
        // Response data here
    },
    "timestamp": "2025-08-28T12:00:00Z"
}
```

### Error Responses

```json
{
    "status": "error",
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Threshold price must be positive",
        "details": {}
    },
    "timestamp": "2025-08-28T12:00:00Z"
}
```

## Error Handling

### HTTP Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 404 | Not Found | Resource not found |
| 422 | Unprocessable Entity | Validation error |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Response Structure

```json
{
    "detail": "Error message",
    "type": "validation_error",
    "errors": [
        {
            "loc": ["field_name"],
            "msg": "Field validation error",
            "type": "value_error"
        }
    ]
}
```

## Rate Limiting

Rate limiting is implemented at the reverse proxy level (Nginx) for production deployments:

- **Web Interface**: 60 requests/minute per IP
- **API Endpoints**: 10 requests/second per IP with burst of 20
- **Health Endpoints**: No rate limiting

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (Unix timestamp)

## Alert Management API

### Create Alert

Create a new price alert.

**Endpoint:** `POST /alerts/`

**Request Body:**
```json
{
    "asset_symbol": "AAPL",
    "asset_type": "stock",
    "condition_type": ">=",
    "threshold_price": 150.00
}
```

**Parameters:**
- `asset_symbol` (string, required): Stock ticker (e.g., "AAPL") or crypto name (e.g., "bitcoin")
- `asset_type` (string, required): Either "stock" or "crypto"
- `condition_type` (string, required): Either ">=" (price above) or "<=" (price below)
- `threshold_price` (number, required): Price threshold (must be positive)

**Response:** `200 OK`
```json
{
    "id": 1,
    "asset_symbol": "AAPL",
    "asset_type": "stock",
    "condition_type": ">=",
    "threshold_price": 150.00,
    "is_active": true,
    "created_at": "2025-08-28T12:00:00Z",
    "last_triggered": null,
    "is_in_cooldown": false,
    "can_trigger": true
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/alerts/" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "asset_symbol=AAPL&asset_type=stock&condition_type=>=&threshold_price=150.00"
```

### Get All Alerts

Retrieve all price alerts.

**Endpoint:** `GET /alerts/`

**Response:** `200 OK`
```json
[
    {
        "id": 1,
        "asset_symbol": "AAPL",
        "asset_type": "stock",
        "condition_type": ">=",
        "threshold_price": 150.00,
        "is_active": true,
        "created_at": "2025-08-28T12:00:00Z",
        "last_triggered": null,
        "is_in_cooldown": false,
        "can_trigger": true
    }
]
```

**Example:**
```bash
curl "http://localhost:8000/alerts/"
```

### Get Active Alerts

Retrieve only active price alerts.

**Endpoint:** `GET /alerts/active`

**Response:** `200 OK`
```json
[
    {
        "id": 1,
        "asset_symbol": "AAPL",
        "asset_type": "stock",
        "condition_type": ">=",
        "threshold_price": 150.00,
        "is_active": true,
        "created_at": "2025-08-28T12:00:00Z",
        "last_triggered": null,
        "is_in_cooldown": false,
        "can_trigger": true
    }
]
```

### Get Alert by ID

Retrieve a specific alert.

**Endpoint:** `GET /alerts/{alert_id}`

**Parameters:**
- `alert_id` (integer, path): Alert ID

**Response:** `200 OK`
```json
{
    "id": 1,
    "asset_symbol": "AAPL",
    "asset_type": "stock",
    "condition_type": ">=",
    "threshold_price": 150.00,
    "is_active": true,
    "created_at": "2025-08-28T12:00:00Z",
    "last_triggered": null,
    "is_in_cooldown": false,
    "can_trigger": true
}
```

**Example:**
```bash
curl "http://localhost:8000/alerts/1"
```

### Update Alert

Update an existing alert.

**Endpoint:** `PUT /alerts/{alert_id}`

**Parameters:**
- `alert_id` (integer, path): Alert ID

**Request Body:**
```json
{
    "threshold_price": 160.00,
    "is_active": false
}
```

**Response:** `200 OK`
```json
{
    "id": 1,
    "asset_symbol": "AAPL",
    "asset_type": "stock",
    "condition_type": ">=",
    "threshold_price": 160.00,
    "is_active": false,
    "created_at": "2025-08-28T12:00:00Z",
    "last_triggered": null,
    "is_in_cooldown": false,
    "can_trigger": true
}
```

**Example:**
```bash
curl -X PUT "http://localhost:8000/alerts/1" \
  -H "Content-Type: application/json" \
  -d '{"threshold_price": 160.00, "is_active": false}'
```

### Toggle Alert Status

Toggle an alert's active status.

**Endpoint:** `POST /alerts/{alert_id}/toggle`

**Parameters:**
- `alert_id` (integer, path): Alert ID

**Response:** `200 OK`
```json
{
    "id": 1,
    "asset_symbol": "AAPL",
    "asset_type": "stock",
    "condition_type": ">=",
    "threshold_price": 150.00,
    "is_active": false,
    "created_at": "2025-08-28T12:00:00Z",
    "last_triggered": null,
    "is_in_cooldown": false,
    "can_trigger": true
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/alerts/1/toggle"
```

### Delete Alert

Delete an alert.

**Endpoint:** `DELETE /alerts/{alert_id}`

**Parameters:**
- `alert_id` (integer, path): Alert ID

**Response:** `200 OK`
```json
{
    "message": "Alert deleted successfully"
}
```

**Example:**
```bash
curl -X DELETE "http://localhost:8000/alerts/1"
```

### Get Alert Statistics

Get summary statistics for all alerts.

**Endpoint:** `GET /alerts/stats`

**Response:** `200 OK`
```json
{
    "total_alerts": 5,
    "active_alerts": 3,
    "inactive_alerts": 2,
    "stock_alerts": 3,
    "crypto_alerts": 2,
    "alerts_in_cooldown": 1
}
```

**Example:**
```bash
curl "http://localhost:8000/alerts/stats"
```

## Scheduler API

### Get Scheduler Status

Get current scheduler status and statistics.

**Endpoint:** `GET /api/scheduler/status`

**Response:** `200 OK`
```json
{
    "is_running": true,
    "last_run": "2025-08-28T12:00:00Z",
    "next_run": "2025-08-28T12:05:00Z",
    "monitoring_interval_minutes": 5,
    "total_runs": 24,
    "successful_runs": 23,
    "failed_runs": 1,
    "last_error": null,
    "alerts_checked_last_run": 5,
    "alerts_triggered_last_run": 0,
    "average_runtime_seconds": 2.3
}
```

**Example:**
```bash
curl "http://localhost:8000/api/scheduler/status"
```

### Start Scheduler

Start the price monitoring scheduler.

**Endpoint:** `POST /api/scheduler/start`

**Response:** `200 OK`
```json
{
    "message": "Scheduler started successfully",
    "success": true
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/api/scheduler/start"
```

### Stop Scheduler

Stop the price monitoring scheduler.

**Endpoint:** `POST /api/scheduler/stop`

**Response:** `200 OK`
```json
{
    "message": "Scheduler stopped successfully",
    "success": true
}
```

### Restart Scheduler

Restart the price monitoring scheduler.

**Endpoint:** `POST /api/scheduler/restart`

**Response:** `200 OK`
```json
{
    "message": "Scheduler restarted successfully",
    "success": true
}
```

### Trigger Manual Check

Manually trigger a price monitoring check.

**Endpoint:** `POST /api/scheduler/check`

**Response:** `200 OK`
```json
{
    "message": "Manual price check completed",
    "success": true,
    "cycle_stats": {
        "alerts_checked": 5,
        "alerts_triggered": 1,
        "runtime_seconds": 2.1,
        "errors": 0
    }
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/api/scheduler/check"
```

### Update Monitoring Interval

Update the price monitoring interval.

**Endpoint:** `PUT /api/scheduler/interval`

**Request Body:**
```json
{
    "minutes": 10
}
```

**Parameters:**
- `minutes` (integer, required): Monitoring interval in minutes (1-60)

**Response:** `200 OK`
```json
{
    "message": "Monitoring interval updated to 10 minutes",
    "new_interval": 10,
    "success": true
}
```

**Example:**
```bash
curl -X PUT "http://localhost:8000/api/scheduler/interval" \
  -H "Content-Type: application/json" \
  -d '{"minutes": 10}'
```

### Scheduler Health Check

Get scheduler health status.

**Endpoint:** `GET /api/scheduler/health`

**Response:** `200 OK` (Healthy) or `503 Service Unavailable` (Unhealthy)
```json
{
    "status": "healthy",
    "scheduler_running": true,
    "last_run": "2025-08-28T12:00:00Z",
    "next_run": "2025-08-28T12:05:00Z"
}
```

## Configuration API

### Get All Configuration

Get all configuration settings organized by category.

**Endpoint:** `GET /api/config/`

**Response:** `200 OK`
```json
{
    "monitoring": {
        "monitoring_interval_minutes": 5,
        "cooldown_hours": 3
    },
    "api_settings": {
        "alpha_vantage_enabled": true,
        "coingecko_api_enabled": true
    },
    "notifications": {
        "enable_whatsapp": true
    }
}
```

### Get Editable Configuration

Get only editable (non-sensitive) configuration settings.

**Endpoint:** `GET /api/config/editable`

**Response:** `200 OK`
```json
{
    "monitoring": {
        "monitoring_interval_minutes": {
            "value": 5,
            "type": "integer",
            "min": 1,
            "max": 60,
            "description": "Price check interval in minutes",
            "requires_restart": false
        }
    }
}
```

### Update Single Setting

Update a single configuration setting.

**Endpoint:** `PUT /api/config/setting`

**Request Body:**
```json
{
    "key": "monitoring_interval_minutes",
    "value": 10
}
```

**Response:** `200 OK`
```json
{
    "success": true,
    "message": "Setting updated successfully",
    "key": "monitoring_interval_minutes",
    "value": 10
}
```

**Example:**
```bash
curl -X PUT "http://localhost:8000/api/config/setting" \
  -H "Content-Type: application/json" \
  -d '{"key": "monitoring_interval_minutes", "value": 10}'
```

### Update Multiple Settings

Update multiple configuration settings.

**Endpoint:** `PUT /api/config/settings`

**Request Body:**
```json
{
    "settings": {
        "monitoring_interval_minutes": 10,
        "cooldown_hours": 6,
        "enable_whatsapp": true
    }
}
```

**Response:** `200 OK`
```json
{
    "successful_updates": {
        "monitoring_interval_minutes": "Setting updated successfully",
        "cooldown_hours": "Setting updated successfully"
    },
    "failed_updates": {
        "enable_whatsapp": "Setting requires restart to take effect"
    },
    "total_attempted": 3,
    "total_successful": 2,
    "total_failed": 1
}
```

### Get Configuration Health

Get configuration health status and validation results.

**Endpoint:** `GET /api/config/health`

**Response:** `200 OK` (Healthy) or `206 Partial Content` (Issues)
```json
{
    "healthy": true,
    "issues": [],
    "warnings": [
        "Alpha Vantage API key not configured"
    ],
    "valid_settings": 8,
    "total_settings": 9
}
```

### Validate Setting Value

Validate a setting value without applying it.

**Endpoint:** `POST /api/config/validate`

**Request Body:**
```json
{
    "key": "monitoring_interval_minutes",
    "value": 10
}
```

**Response:** `200 OK`
```json
{
    "valid": true,
    "error_message": null,
    "converted_value": 10,
    "original_value": 10
}
```

## Health Monitoring API

### Basic Health Check

Basic health check endpoint.

**Endpoint:** `GET /health`

**Response:** `200 OK`
```json
{
    "status": "healthy",
    "service": "price-monitor",
    "version": "1.0.0",
    "timestamp": "2025-08-28T12:00:00Z"
}
```

**Example:**
```bash
curl "http://localhost:8000/health"
```

### Detailed Health Check

Comprehensive health check with all system components.

**Endpoint:** `GET /health/detailed`

**Response:** `200 OK` (Healthy) or `503 Service Unavailable` (Critical)
```json
{
    "overall_status": "healthy",
    "timestamp": "2025-08-28T12:00:00Z",
    "checks": [
        {
            "service": "database",
            "status": "healthy",
            "message": "Database connection successful",
            "response_time_ms": 2.3,
            "details": {
                "total_records": 5,
                "database_size_mb": 0.5
            }
        },
        {
            "service": "alpha_vantage",
            "status": "healthy",
            "message": "API accessible",
            "response_time_ms": 150.2,
            "details": {
                "quota_remaining": 495,
                "quota_limit": 500
            }
        }
    ]
}
```

### Get Health Metrics

Get current health metrics for monitoring dashboards.

**Endpoint:** `GET /api/health/metrics`

**Response:** `200 OK`
```json
{
    "overall_status": "healthy",
    "timestamp": "2025-08-28T12:00:00Z",
    "components": {
        "database": {
            "status": "healthy",
            "response_time_ms": 2.3,
            "message": "Database connection successful"
        },
        "scheduler": {
            "status": "healthy",
            "response_time_ms": null,
            "message": "Scheduler running normally"
        }
    }
}
```

### Get Health History

Get health check history for the specified timeframe.

**Endpoint:** `GET /api/health/history`

**Query Parameters:**
- `timeframe` (string, optional): "1h", "6h", "24h", or "7d" (default: "24h")

**Response:** `200 OK`
```json
[
    {
        "timestamp": "2025-08-28T12:00:00Z",
        "overall_status": "healthy",
        "response_time": 45.2
    },
    {
        "timestamp": "2025-08-28T11:30:00Z",
        "overall_status": "healthy",
        "response_time": 42.1
    }
]
```

**Example:**
```bash
curl "http://localhost:8000/api/health/history?timeframe=24h"
```

### Get Notification Stats

Get notification delivery statistics.

**Endpoint:** `GET /api/notifications/stats`

**Response:** `200 OK`
```json
{
    "total": 25,
    "successful": 24,
    "failed": 1,
    "success_rate": 96.0,
    "recent": [
        {
            "id": "msg_123",
            "status": "delivered",
            "timestamp": "2025-08-28T12:00:00Z",
            "recipient": "+1234567890"
        }
    ]
}
```

## Data Management API

### Get Database Statistics

Get database statistics and health information.

**Endpoint:** `GET /api/data/stats`

**Response:** `200 OK`
```json
{
    "timestamp": "2025-08-28T12:00:00Z",
    "summary": {
        "total_records": 150,
        "total_size_mb": 2.5,
        "table_count": 3
    },
    "tables": [
        {
            "name": "alerts",
            "record_count": 5,
            "size_mb": 0.1,
            "oldest_record": "2025-08-20T10:00:00Z",
            "newest_record": "2025-08-28T12:00:00Z"
        }
    ]
}
```

**Example:**
```bash
curl "http://localhost:8000/api/data/stats"
```

### Get Backup List

Get list of available backups.

**Endpoint:** `GET /api/data/backups`

**Response:** `200 OK`
```json
{
    "backups": [
        {
            "filename": "price_monitor_20250828_120000.db.gz",
            "type": "full",
            "size_mb": 1.2,
            "created_at": "2025-08-28T12:00:00Z",
            "compressed": true,
            "verified": true,
            "checksum": "a1b2c3d4e5f6..."
        }
    ],
    "total_count": 5,
    "total_size_mb": 6.8
}
```

### Create Backup

Create a new database backup.

**Endpoint:** `POST /api/data/backup/create`

**Query Parameters:**
- `backup_type` (string, optional): "full", "incremental", or "archive" (default: "full")
- `compress` (boolean, optional): Whether to compress the backup (default: true)

**Response:** `200 OK`
```json
{
    "success": true,
    "message": "Full backup created successfully",
    "backup": {
        "filename": "price_monitor_20250828_120000.db.gz",
        "type": "full",
        "size_mb": 1.2,
        "created_at": "2025-08-28T12:00:00Z",
        "compressed": true,
        "verified": true
    }
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/api/data/backup/create?backup_type=full&compress=true"
```

### Restore Backup

Restore database from backup.

**Endpoint:** `POST /api/data/backup/restore/{backup_filename}`

**Parameters:**
- `backup_filename` (string, path): Backup filename

**Query Parameters:**
- `create_backup_first` (boolean, optional): Create backup before restore (default: true)

**Response:** `200 OK`
```json
{
    "success": true,
    "message": "Database restored successfully from price_monitor_20250828_120000.db.gz"
}
```

**Example:**
```bash
curl -X POST "http://localhost:8000/api/data/backup/restore/price_monitor_20250828_120000.db.gz"
```

### Download Backup

Download a backup file.

**Endpoint:** `GET /api/data/backup/download/{backup_filename}`

**Parameters:**
- `backup_filename` (string, path): Backup filename

**Response:** `200 OK` (File download)

**Example:**
```bash
curl -o backup.db.gz "http://localhost:8000/api/data/backup/download/price_monitor_20250828_120000.db.gz"
```

### Cleanup Old Data

Clean up old data according to retention policy.

**Endpoint:** `POST /api/data/cleanup`

**Query Parameters:**
- `retention_days` (integer, optional): Number of days to retain (1-365, default: 7)

**Response:** `200 OK`
```json
{
    "success": true,
    "message": "Cleaned up 25 old records",
    "cleanup_stats": {
        "triggered_alerts": 20,
        "old_logs": 5
    },
    "retention_days": 7,
    "total_records_cleaned": 25
}
```

### Perform Database Maintenance

Perform comprehensive database maintenance.

**Endpoint:** `POST /api/data/maintenance`

**Response:** `200 OK`
```json
{
    "vacuum_completed": true,
    "integrity_check_passed": true,
    "indexes_rebuilt": 3,
    "space_reclaimed_mb": 0.5,
    "duration_seconds": 2.1
}
```

## WebSocket Endpoints

### Real-time Updates (Planned)

WebSocket endpoints for real-time updates are planned for future versions:

- `ws://localhost:8000/ws/alerts` - Alert status updates
- `ws://localhost:8000/ws/prices` - Real-time price updates
- `ws://localhost:8000/ws/health` - Health status updates

## SDK Examples

### Python SDK Example

```python
import requests
import json

class PriceMonitorAPI:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        
    def create_alert(self, symbol, asset_type, condition, price):
        """Create a new price alert"""
        data = {
            "asset_symbol": symbol,
            "asset_type": asset_type,
            "condition_type": condition,
            "threshold_price": price
        }
        response = requests.post(f"{self.base_url}/alerts/", data=data)
        return response.json()
    
    def get_alerts(self):
        """Get all alerts"""
        response = requests.get(f"{self.base_url}/alerts/")
        return response.json()
    
    def start_monitoring(self):
        """Start price monitoring"""
        response = requests.post(f"{self.base_url}/api/scheduler/start")
        return response.json()
    
    def get_health(self):
        """Get system health"""
        response = requests.get(f"{self.base_url}/health/detailed")
        return response.json()

# Usage example
api = PriceMonitorAPI()

# Create an alert
alert = api.create_alert("AAPL", "stock", ">=", 150.00)
print(f"Created alert: {alert['id']}")

# Start monitoring
result = api.start_monitoring()
print(f"Monitoring started: {result['success']}")

# Check health
health = api.get_health()
print(f"System status: {health['overall_status']}")
```

### JavaScript SDK Example

```javascript
class PriceMonitorAPI {
    constructor(baseUrl = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
    }
    
    async createAlert(symbol, assetType, condition, price) {
        const formData = new FormData();
        formData.append('asset_symbol', symbol);
        formData.append('asset_type', assetType);
        formData.append('condition_type', condition);
        formData.append('threshold_price', price);
        
        const response = await fetch(`${this.baseUrl}/alerts/`, {
            method: 'POST',
            body: formData
        });
        return response.json();
    }
    
    async getAlerts() {
        const response = await fetch(`${this.baseUrl}/alerts/`);
        return response.json();
    }
    
    async startMonitoring() {
        const response = await fetch(`${this.baseUrl}/api/scheduler/start`, {
            method: 'POST'
        });
        return response.json();
    }
    
    async getHealth() {
        const response = await fetch(`${this.baseUrl}/health/detailed`);
        return response.json();
    }
}

// Usage example
const api = new PriceMonitorAPI();

(async () => {
    try {
        // Create an alert
        const alert = await api.createAlert('AAPL', 'stock', '>=', 150.00);
        console.log(`Created alert: ${alert.id}`);
        
        // Start monitoring
        const result = await api.startMonitoring();
        console.log(`Monitoring started: ${result.success}`);
        
        // Check health
        const health = await api.getHealth();
        console.log(`System status: ${health.overall_status}`);
        
    } catch (error) {
        console.error('API Error:', error);
    }
})();
```

### cURL Examples Collection

```bash
#!/bin/bash
# Price Monitor API Examples

BASE_URL="http://localhost:8000"

# Create a stock alert
curl -X POST "$BASE_URL/alerts/" \
  -d "asset_symbol=AAPL&asset_type=stock&condition_type=>=&threshold_price=150.00"

# Create a crypto alert  
curl -X POST "$BASE_URL/alerts/" \
  -d "asset_symbol=bitcoin&asset_type=crypto&condition_type=<=&threshold_price=50000.00"

# Get all alerts
curl "$BASE_URL/alerts/"

# Get alert statistics
curl "$BASE_URL/alerts/stats"

# Start monitoring
curl -X POST "$BASE_URL/api/scheduler/start"

# Check scheduler status
curl "$BASE_URL/api/scheduler/status"

# Trigger manual check
curl -X POST "$BASE_URL/api/scheduler/check"

# Get system health
curl "$BASE_URL/health/detailed"

# Get configuration
curl "$BASE_URL/api/config/editable"

# Update monitoring interval
curl -X PUT "$BASE_URL/api/config/setting" \
  -H "Content-Type: application/json" \
  -d '{"key": "monitoring_interval_minutes", "value": 10}'

# Create backup
curl -X POST "$BASE_URL/api/data/backup/create?backup_type=full"

# Get database stats
curl "$BASE_URL/api/data/stats"
```

## Best Practices

### API Usage Guidelines

1. **Error Handling**: Always check HTTP status codes and handle errors appropriately
2. **Rate Limiting**: Respect rate limits to avoid being blocked
3. **Data Validation**: Validate input data before sending requests
4. **Timeout Handling**: Set appropriate timeouts for API calls
5. **Retry Logic**: Implement exponential backoff for retries

### Performance Optimization

1. **Batch Operations**: Use bulk endpoints when available
2. **Caching**: Cache frequently accessed data
3. **Compression**: Use gzip compression for large payloads
4. **Pagination**: Use pagination for large datasets (when implemented)

### Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **Input Sanitization**: Sanitize all input data
3. **Authentication**: Implement proper authentication for production use
4. **CORS**: Configure CORS policies appropriately
5. **Rate Limiting**: Implement rate limiting to prevent abuse

---

*This API documentation is automatically generated from the FastAPI application. For interactive API exploration, visit `/docs` (Swagger UI) or `/redoc` (ReDoc) when the application is running.*