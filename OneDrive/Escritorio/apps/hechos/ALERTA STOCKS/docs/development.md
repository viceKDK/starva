# Development Guide - Price Monitor Application

This comprehensive development guide provides information for developers who want to contribute to, extend, or understand the Price Monitor application codebase.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Codebase Structure](#codebase-structure)
- [Development Workflow](#development-workflow)
- [Database Schema](#database-schema)
- [API Development](#api-development)
- [Service Layer](#service-layer)
- [Frontend Development](#frontend-development)
- [Testing Guidelines](#testing-guidelines)
- [Code Quality](#code-quality)
- [Deployment Guidelines](#deployment-guidelines)
- [Contributing Guidelines](#contributing-guidelines)

## Development Setup

### Prerequisites

- Python 3.8+ (3.9+ recommended)
- Git
- IDE/Editor (VS Code, PyCharm, etc.)
- Database browser (DB Browser for SQLite, DBeaver)
- API testing tool (Postman, Insomnia, or curl)

### Local Development Environment

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd price-monitor
   ```

2. **Create Virtual Environment**
   ```bash
   # Create virtual environment
   python -m venv .venv
   
   # Activate virtual environment
   # Windows
   .venv\Scripts\activate
   # Linux/macOS
   source .venv/bin/activate
   ```

3. **Install Dependencies**
   ```bash
   # Install all dependencies
   pip install -r requirements.txt
   
   # Install development dependencies
   pip install -r requirements-dev.txt  # if exists
   ```

4. **Configure Development Environment**
   ```bash
   # Copy example configuration
   cp .env.example .env
   
   # Edit configuration for development
   # Set DEBUG=True
   # Configure API keys
   ```

5. **Initialize Database**
   ```bash
   # Database will be created automatically on first run
   python main.py
   ```

### IDE Configuration

#### VS Code Settings

Create `.vscode/settings.json`:
```json
{
    "python.defaultInterpreterPath": ".venv/bin/python",
    "python.formatting.provider": "black",
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": true,
    "python.testing.pytestEnabled": true,
    "python.testing.unittestEnabled": false,
    "python.testing.pytestArgs": [
        "tests/"
    ],
    "files.exclude": {
        "**/__pycache__": true,
        "**/.pytest_cache": true,
        ".venv": true
    }
}
```

#### VS Code Extensions

Recommended extensions:
- Python Extension Pack
- SQLite Viewer
- REST Client
- GitLens
- Black Formatter
- autoDocstring

### Development Tools

1. **Code Formatting**
   ```bash
   # Install black formatter
   pip install black
   
   # Format code
   black src/ tests/
   ```

2. **Linting**
   ```bash
   # Install pylint
   pip install pylint
   
   # Lint code
   pylint src/
   ```

3. **Type Checking**
   ```bash
   # Install mypy
   pip install mypy
   
   # Type check
   mypy src/
   ```

## Project Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Browser   │    │  FastAPI Backend │    │   External APIs │
│   (Frontend)    │◄──►│   (Business      │◄──►│   - Alpha       │
│   - HTML/JS     │    │    Logic)        │    │     Vantage     │
│   - CSS         │    │   - REST API     │    │   - CoinGecko   │
└─────────────────┘    │   - Services     │    │   - Twilio      │
                       │   - Scheduler    │    └─────────────────┘
                       └──────────────────┘
                                ▲
                                │
                       ┌────────▼────────┐
                       │   SQLite DB     │
                       │   - Alerts      │
                       │   - Logs        │
                       └─────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Backend Framework** | FastAPI | Web API, request handling |
| **Frontend** | Jinja2 + HTML/JS | Server-side templating |
| **Database** | SQLite | Data persistence |
| **ORM** | SQLAlchemy | Database operations |
| **Async Runtime** | AsyncIO | Asynchronous operations |
| **Scheduler** | APScheduler | Background tasks |
| **HTTP Client** | httpx | API calls |
| **Validation** | Pydantic | Data validation |
| **Logging** | Python logging | Application logging |

### Design Patterns

1. **Layered Architecture**
   - Presentation Layer (Routes)
   - Business Logic Layer (Services)
   - Data Access Layer (Database)

2. **Repository Pattern**
   - Database abstraction through service layer
   - Clean separation of concerns

3. **Dependency Injection**
   - Configuration through environment variables
   - Service dependencies managed centrally

4. **Observer Pattern**
   - Event-driven price monitoring
   - Alert triggering system

## Codebase Structure

### Directory Organization

```
price-monitor/
├── docs/                          # Documentation
│   ├── api.md                     # API documentation
│   ├── deployment.md              # Deployment guide
│   ├── development.md             # Development guide (this file)
│   ├── troubleshooting.md         # Troubleshooting guide
│   └── user-manual.md             # User manual
├── src/                           # Source code
│   ├── config/                    # Configuration management
│   │   ├── __init__.py
│   │   └── settings.py            # Application settings
│   ├── models/                    # Data models
│   │   ├── __init__.py
│   │   ├── alert.py               # Alert database model
│   │   ├── price_data.py          # Price data models
│   │   └── schemas.py             # Pydantic schemas
│   ├── routes/                    # API routes
│   │   ├── __init__.py
│   │   ├── alert_routes.py        # Alert management endpoints
│   │   ├── config_routes.py       # Configuration endpoints
│   │   ├── data_management_routes.py # Data management endpoints
│   │   ├── health_routes.py       # Health monitoring endpoints
│   │   └── scheduler_routes.py    # Scheduler control endpoints
│   ├── services/                  # Business logic services
│   │   ├── __init__.py
│   │   ├── alert_service.py       # Alert business logic
│   │   ├── alpha_vantage_service.py # Stock API integration
│   │   ├── coingecko_service.py   # Crypto API integration
│   │   ├── config_service.py      # Configuration management
│   │   ├── data_management_service.py # Database operations
│   │   ├── health_service.py      # Health monitoring
│   │   ├── monitoring_scheduler.py # Price monitoring scheduler
│   │   ├── price_cache.py         # Price data caching
│   │   ├── price_service.py       # Price aggregation service
│   │   ├── scheduler_service.py   # Scheduler management
│   │   └── whatsapp_service.py    # WhatsApp notifications
│   └── utils/                     # Utility modules
│       ├── __init__.py
│       ├── database.py            # Database connection utilities
│       ├── logging_config.py      # Logging configuration
│       └── rate_limiter.py        # Rate limiting utilities
├── static/                        # Static web assets
│   ├── css/
│   │   └── styles.css             # Application styles
│   └── js/
│       ├── dashboard.js           # Dashboard functionality
│       ├── data-management.js     # Data management UI
│       └── health-dashboard.js    # Health monitoring UI
├── templates/                     # HTML templates
│   ├── base.html                  # Base template
│   ├── dashboard.html             # Main dashboard
│   ├── data-management.html       # Data management page
│   ├── health.html                # Health monitoring page
│   └── settings.html              # Settings page
├── tests/                         # Test suite
│   ├── __init__.py
│   ├── test_alert_routes.py       # Alert API tests
│   ├── test_models.py             # Database model tests
│   ├── test_price_services.py     # Price service tests
│   └── test_*.py                  # Other test modules
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git ignore rules
├── conftest.py                    # Pytest configuration
├── main.py                        # Application entry point
├── README.md                      # Project overview
└── requirements.txt               # Python dependencies
```

### Key Modules

#### Application Entry Point (`main.py`)

```python
"""
Main application entry point
- FastAPI app initialization
- Route registration
- Startup/shutdown event handlers
- Application configuration
"""
```

#### Configuration (`src/config/settings.py`)

```python
"""
Application settings management using Pydantic
- Environment variable loading
- Configuration validation
- Settings caching
- Default value management
"""
```

#### Models (`src/models/`)

- **`alert.py`**: SQLAlchemy ORM model for alerts
- **`price_data.py`**: Price data structures
- **`schemas.py`**: Pydantic schemas for API validation

#### Services (`src/services/`)

Business logic layer containing:
- **`alert_service.py`**: Alert CRUD operations
- **`price_service.py`**: Price data aggregation
- **`monitoring_scheduler.py`**: Background price monitoring
- **`whatsapp_service.py`**: Notification management
- **External API services**: Alpha Vantage, CoinGecko integrations

#### Routes (`src/routes/`)

FastAPI route handlers:
- RESTful API endpoints
- Request/response handling
- Error handling
- Input validation

## Development Workflow

### Git Workflow

1. **Branch Strategy**
   ```bash
   # Main branches
   main          # Production-ready code
   develop       # Integration branch
   
   # Feature branches
   feature/alert-management
   feature/whatsapp-integration
   
   # Bugfix branches
   bugfix/price-fetch-error
   
   # Release branches
   release/v1.1.0
   ```

2. **Commit Message Format**
   ```
   type(scope): subject
   
   body (optional)
   
   footer (optional)
   
   # Examples:
   feat(alerts): add alert cooldown functionality
   fix(api): resolve alpha vantage rate limiting
   docs(readme): update installation instructions
   test(services): add unit tests for price service
   ```

3. **Pull Request Process**
   - Create feature branch from develop
   - Implement changes with tests
   - Update documentation if needed
   - Submit PR to develop branch
   - Code review and testing
   - Merge to develop, then to main

### Development Process

1. **Planning**
   - Define requirements clearly
   - Create technical design document
   - Estimate effort and timeline
   - Identify dependencies

2. **Implementation**
   - Write failing tests first (TDD)
   - Implement minimal functionality
   - Refactor and optimize
   - Add comprehensive error handling

3. **Testing**
   - Unit tests for business logic
   - Integration tests for APIs
   - Manual testing of web interface
   - Performance testing for scalability

4. **Code Review**
   - Peer review for code quality
   - Security review for sensitive changes
   - Documentation review
   - Performance review

5. **Deployment**
   - Deploy to staging environment
   - Run integration tests
   - User acceptance testing
   - Deploy to production

## Database Schema

### Alert Model

```sql
CREATE TABLE alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_symbol VARCHAR(20) NOT NULL,
    asset_type VARCHAR(10) NOT NULL,
    condition_type VARCHAR(2) NOT NULL,
    threshold_price FLOAT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_triggered DATETIME NULL,
    
    CONSTRAINT check_asset_type CHECK (asset_type IN ('stock', 'crypto')),
    CONSTRAINT check_condition_type CHECK (condition_type IN ('>=', '<=')),
    CONSTRAINT check_threshold_price CHECK (threshold_price > 0)
);

CREATE INDEX idx_alerts_active ON alerts(is_active);
CREATE INDEX idx_alerts_symbol ON alerts(asset_symbol);
CREATE INDEX idx_alerts_type ON alerts(asset_type);
```

### Database Migrations

For schema changes, follow this process:

1. **Create Migration Script**
   ```python
   # migrations/001_add_alert_name_column.py
   async def upgrade(connection):
       await connection.execute("""
           ALTER TABLE alerts 
           ADD COLUMN alert_name VARCHAR(100) DEFAULT '';
       """)
   
   async def downgrade(connection):
       # SQLite doesn't support DROP COLUMN
       # Would need to recreate table without column
       pass
   ```

2. **Apply Migration**
   ```bash
   python -m migrations.apply
   ```

### Database Best Practices

1. **Connection Management**
   - Use connection pooling
   - Handle connection timeouts
   - Implement retry logic for transient errors

2. **Query Optimization**
   - Use indexes for frequently queried columns
   - Limit result sets with pagination
   - Use prepared statements to prevent SQL injection

3. **Data Integrity**
   - Use database constraints for validation
   - Implement proper foreign key relationships
   - Handle concurrent access with transactions

## API Development

### Route Structure

```python
from fastapi import APIRouter, HTTPException, Depends
from src.models.schemas import AlertCreate, AlertResponse
from src.services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.post("/", response_model=AlertResponse)
async def create_alert(alert_data: AlertCreate):
    """
    Create a new price alert
    
    Args:
        alert_data: Alert configuration data
        
    Returns:
        Created alert information
        
    Raises:
        HTTPException: If creation fails
    """
    try:
        result = await AlertService.create_alert(alert_data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")
```

### Error Handling

1. **Consistent Error Format**
   ```python
   from fastapi import HTTPException
   
   # Standard error response
   raise HTTPException(
       status_code=422,
       detail={
           "error": "VALIDATION_ERROR",
           "message": "Threshold price must be positive",
           "field": "threshold_price"
       }
   )
   ```

2. **Global Exception Handler**
   ```python
   from fastapi import FastAPI, Request
   from fastapi.responses import JSONResponse
   
   app = FastAPI()
   
   @app.exception_handler(ValueError)
   async def validation_exception_handler(request: Request, exc: ValueError):
       return JSONResponse(
           status_code=422,
           content={"error": "VALIDATION_ERROR", "message": str(exc)}
       )
   ```

### Input Validation

Use Pydantic models for request validation:

```python
from pydantic import BaseModel, Field, validator

class AlertCreate(BaseModel):
    asset_symbol: str = Field(..., min_length=1, max_length=20)
    asset_type: Literal["stock", "crypto"]
    condition_type: Literal[">=", "<="]
    threshold_price: float = Field(..., gt=0)
    
    @validator('asset_symbol')
    def validate_symbol(cls, v):
        v = v.strip().upper()
        if not v.replace('-', '').replace('.', '').isalnum():
            raise ValueError('Invalid asset symbol format')
        return v
```

### API Documentation

FastAPI automatically generates API documentation:

1. **Interactive API docs**: `/docs` (Swagger UI)
2. **Alternative docs**: `/redoc` (ReDoc)
3. **OpenAPI schema**: `/openapi.json`

Enhance documentation with:
```python
@router.post(
    "/",
    response_model=AlertResponse,
    summary="Create Price Alert",
    description="Create a new price alert for monitoring asset prices",
    responses={
        201: {"description": "Alert created successfully"},
        422: {"description": "Validation error"},
        500: {"description": "Internal server error"}
    }
)
```

## Service Layer

### Service Pattern

Services encapsulate business logic and provide clean interfaces:

```python
class AlertService:
    """Alert management business logic"""
    
    @staticmethod
    async def create_alert(alert_data: AlertCreate) -> AlertResponse:
        """Create new alert with validation and side effects"""
        
        # 1. Validate business rules
        await AlertService._validate_alert_creation(alert_data)
        
        # 2. Create database record
        alert = await AlertService._create_alert_record(alert_data)
        
        # 3. Handle side effects (notifications, logging, etc.)
        await AlertService._handle_alert_created(alert)
        
        # 4. Return response
        return AlertResponse.from_orm(alert)
    
    @staticmethod
    async def _validate_alert_creation(alert_data: AlertCreate):
        """Business validation logic"""
        # Check for duplicate alerts
        # Validate asset symbol exists
        # Check user limits, etc.
        pass
```

### Service Dependencies

Manage service dependencies through configuration:

```python
from src.config.settings import get_settings
from src.services.price_service import PriceService
from src.services.whatsapp_service import WhatsAppService

class AlertService:
    def __init__(self):
        self.settings = get_settings()
        self.price_service = PriceService()
        self.whatsapp_service = WhatsAppService()
```

### Error Handling in Services

```python
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class AlertService:
    @staticmethod
    async def get_alert(alert_id: int) -> Optional[AlertResponse]:
        try:
            # Database operation
            alert = await db.fetch_alert(alert_id)
            
            if not alert:
                logger.warning(f"Alert not found: {alert_id}")
                return None
                
            return AlertResponse.from_orm(alert)
            
        except Exception as e:
            logger.error(f"Error fetching alert {alert_id}: {e}", exc_info=True)
            raise ServiceException(f"Failed to retrieve alert: {e}")
```

## Frontend Development

### Template Structure

The frontend uses Jinja2 templates with a base template pattern:

```html
<!-- templates/base.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}Price Monitor{% endblock %}</title>
    <link rel="stylesheet" href="{{ url_for('static', path='/css/styles.css') }}">
</head>
<body>
    <nav class="navbar">
        <!-- Navigation menu -->
    </nav>
    
    <main class="main-content">
        {% block content %}{% endblock %}
    </main>
    
    <script src="{{ url_for('static', path='/js/common.js') }}"></script>
    {% block scripts %}{% endblock %}
</body>
</html>
```

### JavaScript Architecture

```javascript
// static/js/dashboard.js
class DashboardManager {
    constructor() {
        this.apiBase = '';
        this.refreshInterval = 30000; // 30 seconds
        this.init();
    }
    
    init() {
        this.loadAlerts();
        this.setupEventListeners();
        this.startAutoRefresh();
    }
    
    async loadAlerts() {
        try {
            const response = await fetch('/alerts/');
            const alerts = await response.json();
            this.renderAlerts(alerts);
        } catch (error) {
            console.error('Failed to load alerts:', error);
            this.showError('Failed to load alerts');
        }
    }
    
    setupEventListeners() {
        // Form submissions
        document.getElementById('alert-form')
            .addEventListener('submit', this.handleAlertSubmit.bind(this));
        
        // Button clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action]')) {
                this.handleAction(e.target.dataset.action, e.target);
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});
```

### CSS Architecture

```css
/* static/css/styles.css */

/* CSS Custom Properties for theming */
:root {
    --primary-color: #2563eb;
    --success-color: #059669;
    --warning-color: #d97706;
    --error-color: #dc2626;
    --background-color: #f9fafb;
    --text-color: #111827;
    --border-color: #d1d5db;
}

/* Component-based CSS */
.card {
    background: white;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    padding: 1.5rem;
    margin-bottom: 1rem;
}

.btn {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
}

.btn-primary {
    background-color: var(--primary-color);
    color: white;
}

.btn-primary:hover {
    background-color: #1d4ed8;
}
```

### State Management

For complex state, use a simple state management pattern:

```javascript
class AppState {
    constructor() {
        this.state = {
            alerts: [],
            systemHealth: 'unknown',
            schedulerStatus: 'stopped'
        };
        this.listeners = new Set();
    }
    
    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.notifyListeners();
    }
    
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    
    notifyListeners() {
        this.listeners.forEach(listener => listener(this.state));
    }
}

const appState = new AppState();
```

## Testing Guidelines

### Test Structure

```
tests/
├── conftest.py                    # Test configuration
├── test_models/                   # Database model tests
│   ├── __init__.py
│   └── test_alert.py
├── test_services/                 # Business logic tests
│   ├── __init__.py
│   ├── test_alert_service.py
│   └── test_price_service.py
├── test_routes/                   # API endpoint tests
│   ├── __init__.py
│   └── test_alert_routes.py
└── test_integration/              # Integration tests
    ├── __init__.py
    └── test_alert_workflow.py
```

### Unit Testing

```python
# tests/test_services/test_alert_service.py
import pytest
from unittest.mock import Mock, patch
from src.services.alert_service import AlertService
from src.models.schemas import AlertCreate

@pytest.fixture
def sample_alert_data():
    return AlertCreate(
        asset_symbol="AAPL",
        asset_type="stock",
        condition_type=">=",
        threshold_price=150.00
    )

@pytest.mark.asyncio
async def test_create_alert_success(sample_alert_data):
    """Test successful alert creation"""
    with patch('src.services.alert_service.get_db_connection') as mock_db:
        mock_db.return_value.execute.return_value = Mock(lastrowid=1)
        
        result = await AlertService.create_alert(sample_alert_data)
        
        assert result.id == 1
        assert result.asset_symbol == "AAPL"
        assert result.is_active is True

@pytest.mark.asyncio
async def test_create_alert_validation_error(sample_alert_data):
    """Test alert creation with validation error"""
    sample_alert_data.threshold_price = -100  # Invalid price
    
    with pytest.raises(ValueError, match="Threshold price must be positive"):
        await AlertService.create_alert(sample_alert_data)
```

### Integration Testing

```python
# tests/test_integration/test_alert_workflow.py
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_alert_creation_workflow():
    """Test complete alert creation workflow"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create alert
        response = await client.post("/alerts/", data={
            "asset_symbol": "AAPL",
            "asset_type": "stock",
            "condition_type": ">=",
            "threshold_price": 150.00
        })
        assert response.status_code == 200
        alert_id = response.json()["id"]
        
        # Verify alert exists
        response = await client.get(f"/alerts/{alert_id}")
        assert response.status_code == 200
        assert response.json()["asset_symbol"] == "AAPL"
        
        # Toggle alert status
        response = await client.post(f"/alerts/{alert_id}/toggle")
        assert response.status_code == 200
        assert response.json()["is_active"] is False
```

### Test Configuration

```python
# conftest.py
import pytest
import asyncio
from httpx import AsyncClient
from main import app

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for session scope"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def test_client():
    """Create test client"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
async def test_db():
    """Create test database"""
    # Setup test database
    # Cleanup after test
    pass
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src

# Run specific test file
pytest tests/test_services/test_alert_service.py

# Run with verbose output
pytest -v

# Run only integration tests
pytest tests/test_integration/
```

## Code Quality

### Code Style

Follow PEP 8 Python style guidelines:

1. **Line Length**: Maximum 88 characters (Black formatter default)
2. **Imports**: Group imports (standard library, third-party, local)
3. **Naming**: Use snake_case for functions/variables, PascalCase for classes
4. **Documentation**: Use docstrings for all public functions and classes

### Type Hints

Use type hints throughout the codebase:

```python
from typing import List, Optional, Dict, Any
from datetime import datetime

async def get_alerts(
    active_only: bool = False,
    limit: Optional[int] = None
) -> List[AlertResponse]:
    """
    Get alerts with optional filtering
    
    Args:
        active_only: If True, return only active alerts
        limit: Maximum number of alerts to return
        
    Returns:
        List of alert responses
    """
    # Implementation here
```

### Documentation

1. **Docstring Format** (Google Style):
   ```python
   def calculate_price_change(
       current_price: float,
       previous_price: float
   ) -> float:
       """Calculate percentage price change.
       
       Args:
           current_price: Current asset price
           previous_price: Previous asset price
           
       Returns:
           Percentage change as decimal (0.05 = 5%)
           
       Raises:
           ValueError: If previous_price is zero or negative
           
       Example:
           >>> calculate_price_change(105.0, 100.0)
           0.05
       """
   ```

2. **README Updates**: Keep README.md updated with setup instructions
3. **API Documentation**: Maintain API docs with examples
4. **Architecture Documentation**: Update docs when architecture changes

### Error Handling

1. **Specific Exceptions**: Use specific exception types
   ```python
   class AlertNotFoundError(Exception):
       """Raised when alert is not found"""
       pass
   
   class PriceDataError(Exception):
       """Raised when price data is invalid"""
       pass
   ```

2. **Logging**: Use structured logging
   ```python
   logger.info(
       "Alert created successfully",
       extra={
           "alert_id": alert.id,
           "asset_symbol": alert.asset_symbol,
           "user_id": user.id
       }
   )
   ```

3. **Context Managers**: Use for resource management
   ```python
   async with get_db_connection() as conn:
       result = await conn.execute(query)
   ```

## Deployment Guidelines

### Environment Configuration

1. **Environment Variables**: Use for all configuration
2. **Secret Management**: Keep secrets secure, never commit to git
3. **Configuration Validation**: Validate all settings on startup

### Docker Deployment

```dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -r -s /bin/false appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["python", "main.py"]
```

### Production Checklist

- [ ] All secrets configured securely
- [ ] Debug mode disabled
- [ ] Appropriate log levels set
- [ ] Database backed up
- [ ] Health monitoring configured
- [ ] Rate limiting enabled
- [ ] SSL/TLS configured
- [ ] Security headers configured
- [ ] Performance monitoring active
- [ ] Backup procedures tested

## Contributing Guidelines

### Getting Started

1. **Fork Repository**: Create fork of the main repository
2. **Clone Fork**: Clone your fork locally
3. **Create Branch**: Create feature branch for changes
4. **Development Environment**: Set up local development environment

### Making Changes

1. **Issue First**: Create or reference existing issue
2. **Small Changes**: Keep changes focused and small
3. **Tests**: Add tests for new functionality
4. **Documentation**: Update relevant documentation
5. **Code Quality**: Follow style guidelines and best practices

### Submitting Changes

1. **Commit Messages**: Use clear, descriptive commit messages
2. **Pull Request**: Create PR with detailed description
3. **Review Process**: Address feedback from code review
4. **Testing**: Ensure all tests pass
5. **Documentation**: Update documentation as needed

### Code Review

1. **Functionality**: Does code work as intended?
2. **Testing**: Are there adequate tests?
3. **Performance**: Any performance implications?
4. **Security**: Any security concerns?
5. **Maintainability**: Is code easy to understand and maintain?

### Release Process

1. **Version Bump**: Update version numbers
2. **Changelog**: Update CHANGELOG.md
3. **Testing**: Run full test suite
4. **Documentation**: Update documentation
5. **Deployment**: Deploy to staging, then production
6. **Monitoring**: Monitor application after deployment

---

*This development guide is maintained by the development team and should be updated as the project evolves. For questions or clarifications, please reach out to the development team or create an issue in the project repository.*