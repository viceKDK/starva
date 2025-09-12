# Technical Assumptions

## Repository Structure: Monorepo
Single repository containing all application components - backend, frontend templates, static assets, and configuration files in a simple Python project structure.

## Service Architecture
**Monolithic local application** built with Python FastAPI serving both API endpoints and HTML templates. Single-process application with integrated scheduler for price monitoring and SQLite for data persistence.

## Testing Requirements
**Unit testing with basic integration tests** focusing on core alert logic, price fetching, and notification sending. Manual testing for UI workflows given the simple interface.

## Additional Technical Assumptions and Requests

**Technology Stack:**
- **Backend:** Python 3.8+ with FastAPI framework
- **Frontend:** Jinja2 templates with minimal vanilla JavaScript
- **Database:** SQLite for local data persistence
- **Scheduler:** APScheduler for automated price checking
- **HTTP Client:** requests library for API calls
- **Messaging:** Twilio SDK for WhatsApp integration

**APIs and External Services:**
- Alpha Vantage API (free tier, 5 calls/minute) for stock prices
- CoinGecko API (free tier, unlimited basic requests) for cryptocurrency prices
- Twilio WhatsApp Sandbox for development, WhatsApp Cloud API for production

**Deployment and Environment:**
- Local development and production on Windows PC
- uvicorn ASGI server for local hosting
- Environment-based configuration via .env files
- No containerization needed for personal use

**Security Considerations:**
- API keys stored in .env files (not committed to version control)
- Local-only access (127.0.0.1 binding)
- No authentication required (single-user, local access)
