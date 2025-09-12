# Components

## FastAPI Web Application

**Responsibility:** Main application entry point serving both HTML templates and JSON API endpoints for alert management and system status.

**Key Interfaces:**
- HTTP endpoints for CRUD operations on alerts
- HTML template rendering for web interface
- Health check and status endpoints

**Dependencies:** SQLAlchemy (database), Jinja2 (templates), Alert Service

**Technology Stack:** FastAPI with Jinja2 templates, uvicorn ASGI server

## Alert Management Service

**Responsibility:** Business logic for creating, updating, deleting, and querying price alerts with validation and persistence.

**Key Interfaces:**
- CRUD operations on Alert entities
- Alert validation (asset types, condition types, price validation)
- Active alert filtering for monitoring

**Dependencies:** Database Models, Configuration

**Technology Stack:** Python service classes with SQLAlchemy ORM

## Price Monitoring Service

**Responsibility:** Automated price fetching from external APIs, alert evaluation, and triggering notifications when conditions are met.

**Key Interfaces:**
- Price fetching from Alpha Vantage and CoinGecko APIs
- Alert condition evaluation against current prices
- Cooldown period management

**Dependencies:** Alert Service, WhatsApp Service, External APIs

**Technology Stack:** Python with requests library, APScheduler integration

## WhatsApp Notification Service

**Responsibility:** Send formatted WhatsApp messages through Twilio when price alerts are triggered.

**Key Interfaces:**
- Message formatting with price and alert details
- Twilio WhatsApp API integration
- Delivery confirmation and error handling

**Dependencies:** Twilio SDK, Configuration Service

**Technology Stack:** Python with Twilio SDK

## Database Service

**Responsibility:** SQLite database connection management, schema initialization, and ORM configuration.

**Key Interfaces:**
- Database connection and session management
- Automatic table creation on first run
- Transaction management for data consistency

**Dependencies:** SQLite file system

**Technology Stack:** SQLAlchemy ORM with SQLite dialect

## Configuration Service

**Responsibility:** Load and validate configuration from environment variables with secure handling of API keys.

**Key Interfaces:**
- Environment variable loading and parsing
- Configuration validation and defaults
- Secure API key management

**Dependencies:** python-dotenv, OS environment

**Technology Stack:** Python with environment variable parsing
