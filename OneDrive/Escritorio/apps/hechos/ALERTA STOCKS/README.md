# Price Monitor - WhatsApp Price Monitoring Application

A comprehensive price monitoring application that tracks cryptocurrency and stock prices, sends WhatsApp alerts when price targets are met, and provides a web-based dashboard for monitoring and configuration.

## Features

- 📊 **Real-time Price Monitoring**: Track cryptocurrency and stock prices from multiple APIs
- 📱 **WhatsApp Notifications**: Get instant alerts via WhatsApp when price targets are reached
- 🌐 **Web Dashboard**: Monitor alerts, view price history, and manage configurations
- ⚙️ **Configuration Management**: Easy web-based configuration with hot-reload capabilities
- 🏥 **Health Monitoring**: Comprehensive system health checks and status dashboard
- 💾 **Data Management**: Automated backups, data cleanup, and maintenance tools
- 📈 **Performance Tracking**: Detailed logging and performance metrics
- 🔒 **Security**: Structured logging, error handling, and secure configuration

## Quick Start

### Prerequisites

- Python 3.8 or higher
- Git (for cloning the repository)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd finanzas
   ```

2. **Create a virtual environment**
   ```bash
   # Windows
   python -m venv .venv
   .venv\Scripts\activate

   # Linux/macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure the application**
   ```bash
   # Copy the example configuration file
   cp .env.example .env
   
   # Edit .env with your API keys and settings
   # See Configuration section for detailed instructions
   ```

5. **Run the application**
   ```bash
   python main.py
   ```

6. **Access the web interface**
   Open your browser and go to `http://localhost:8000`

## Configuration

The application uses environment variables for configuration. Copy `.env.example` to `.env` and configure the following:

### Required Settings

```env
# API Keys
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
WHATSAPP_NUMBER=+1234567890

# Database
DATABASE_PATH=./data/price_monitor.db

# Server Settings
HOST=127.0.0.1
PORT=8000
DEBUG=false
```

### Optional Settings

```env
# Monitoring
MONITORING_INTERVAL_MINUTES=5
COOLDOWN_HOURS=3

# Logging
LOG_LEVEL=INFO

# Features
ENABLE_WHATSAPP=true
```

For detailed configuration options, see the [Configuration Guide](docs/configuration.md).

## Usage

### Setting Up Price Alerts

1. Access the web dashboard at `http://localhost:8000`
2. Navigate to the main dashboard
3. Add a new price alert with:
   - Asset symbol (e.g., AAPL, bitcoin)
   - Target price
   - Condition (>= or <=)
4. The system will automatically monitor prices and send WhatsApp notifications

### Managing the System

- **Health Monitoring**: Visit `/health` to view system status
- **Configuration**: Visit `/settings` to modify application settings
- **Data Management**: Visit `/data` for backup and maintenance operations

## Documentation

- [Installation Guide](docs/installation.md) - Detailed setup instructions
- [Configuration Guide](docs/configuration.md) - Complete configuration reference
- [User Manual](docs/user-manual.md) - How to use all features
- [API Documentation](docs/api.md) - Complete API reference
- [Troubleshooting Guide](docs/troubleshooting.md) - Common issues and solutions
- [Development Guide](docs/development.md) - For contributors and developers
- [Deployment Guide](docs/deployment.md) - Production deployment instructions

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Interface │    │  FastAPI Backend │    │   Price APIs    │
│   (Dashboard)   │◄──►│   (REST API)     │◄──►│ Alpha Vantage   │
└─────────────────┘    └──────────────────┘    │   CoinGecko     │
                                ▲              └─────────────────┘
                                │
                       ┌────────▼────────┐
                       │   SQLite DB     │
                       │   (Alerts &     │
                       │   Notifications)│
                       └─────────────────┘
                                ▲
                                │
                       ┌────────▼────────┐
                       │  WhatsApp API   │
                       │    (Twilio)     │
                       └─────────────────┘
```

## Key Components

- **FastAPI Backend**: RESTful API server handling all business logic
- **SQLite Database**: Lightweight database for alerts and notification history
- **Price Services**: Integration with Alpha Vantage and CoinGecko APIs
- **WhatsApp Service**: Twilio integration for WhatsApp notifications
- **Scheduler**: APScheduler for periodic price monitoring
- **Health Service**: Comprehensive health checks and monitoring
- **Data Management**: Automated backups and maintenance

## Security Considerations

- API keys are stored in environment variables
- Structured logging without sensitive data exposure
- Input validation and sanitization
- Rate limiting on external API calls
- Database backup encryption support

## Contributing

We welcome contributions! Please see the [Development Guide](docs/development.md) for setup instructions and coding guidelines.

## Support

If you encounter issues:

1. Check the [Troubleshooting Guide](docs/troubleshooting.md)
2. Review the logs in the `logs/` directory
3. Check the Health Dashboard for system status
4. Review the configuration settings

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a history of changes and updates.

## Advanced Alerts (New)

API endpoints under `/advanced-alerts` let you create:
- Percentage change alerts using 24h change (crypto), previous close (stocks), or a captured baseline.
- Technical indicator alerts (stocks via Alpha Vantage) for RSI and SMA with greater_than/less_than operators.

Examples (JSON bodies for POST /advanced-alerts/):
- Percentage (stock prev close): {"asset_symbol":"AAPL","asset_type":"stock","alert_type":"percentage_change","timeframe":"1d","conditions":{"change_percentage":3,"direction":"up","comparison_base":"previous_close"}}
- Percentage (crypto 24h): {"asset_symbol":"bitcoin","asset_type":"crypto","alert_type":"percentage_change","timeframe":"1d","conditions":{"change_percentage":5,"direction":"any","comparison_base":"24h"}}
- RSI: {"asset_symbol":"AAPL","asset_type":"stock","alert_type":"technical_indicator","timeframe":"1d","conditions":{"indicator":"rsi","operator":"greater_than","threshold":70,"period":14}}
- SMA: {"asset_symbol":"AAPL","asset_type":"stock","alert_type":"technical_indicator","timeframe":"1d","conditions":{"indicator":"sma","operator":"less_than","threshold":100,"period":20}}
