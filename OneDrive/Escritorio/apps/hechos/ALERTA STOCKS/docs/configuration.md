# Configuration Guide

This guide covers all configuration options for the Price Monitor application, including environment variables, web interface settings, and advanced configuration scenarios.

## Table of Contents

- [Configuration Methods](#configuration-methods)
- [Environment Variables](#environment-variables)
- [Web Interface Configuration](#web-interface-configuration)
- [Configuration Validation](#configuration-validation)
- [Environment-Specific Configurations](#environment-specific-configurations)
- [Advanced Configuration](#advanced-configuration)
- [Troubleshooting Configuration Issues](#troubleshooting-configuration-issues)

## Configuration Methods

The application supports multiple configuration methods:

1. **Environment Variables** (`.env` file) - Primary configuration method
2. **Web Interface** - Runtime configuration for non-sensitive settings
3. **Command Line Arguments** - Override settings for testing
4. **Environment Overrides** - System environment variables

Configuration precedence (highest to lowest):
1. System environment variables
2. `.env` file
3. Web interface settings
4. Default values

## Environment Variables

### Required Configuration

Create a `.env` file in the application root directory:

```env
# API Keys - REQUIRED for full functionality
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
WHATSAPP_NUMBER=+1234567890

# Database Configuration
DATABASE_PATH=./data/price_monitor.db
```

### Server Configuration

```env
# Server Settings
HOST=127.0.0.1                    # Server bind address
PORT=8000                         # Server port
DEBUG=false                       # Enable debug mode (never true in production)
```

**Options:**
- `HOST`: 
  - `127.0.0.1` - Local access only (development)
  - `0.0.0.0` - Accept connections from any IP (production)
  - Specific IP - Bind to specific network interface
- `PORT`: Any available port (1024-65535 recommended)
- `DEBUG`: 
  - `true` - Enable debug logging and auto-reload
  - `false` - Production mode with optimized performance

### Monitoring Configuration

```env
# Price Monitoring Settings
MONITORING_INTERVAL_MINUTES=5     # How often to check prices (1-60 minutes)
COOLDOWN_HOURS=3                  # Hours to wait before re-alerting (0.5-24 hours)
```

**Monitoring Interval Guidelines:**
- **1-2 minutes**: High-frequency trading, may hit API rate limits
- **5 minutes**: Recommended for active trading
- **15-30 minutes**: Good for long-term monitoring
- **60 minutes**: Conservative monitoring, lowest API usage

**Cooldown Period Guidelines:**
- **0.5-1 hour**: Frequent updates for volatile assets
- **3 hours**: Balanced approach (recommended)
- **6-24 hours**: Conservative notifications

### Logging Configuration

```env
# Logging Settings
LOG_LEVEL=INFO                    # Logging level (DEBUG, INFO, WARNING, ERROR)
```

**Log Levels:**
- `DEBUG`: Detailed debugging information (development only)
- `INFO`: General information about application operation
- `WARNING`: Important events that might require attention
- `ERROR`: Error conditions that don't stop the application

### Feature Toggles

```env
# Feature Control
ENABLE_WHATSAPP=true             # Enable/disable WhatsApp notifications
```

### API Configuration

```env
# External API Settings
ALPHA_VANTAGE_API_KEY=your_key   # Alpha Vantage API key for stock prices
COINGECKO_API_URL=https://api.coingecko.com/api/v3  # CoinGecko API endpoint (optional)
```

### WhatsApp/Twilio Configuration

```env
# Twilio WhatsApp Settings
TWILIO_ACCOUNT_SID=ACxxxx        # Your Twilio Account SID
TWILIO_AUTH_TOKEN=your_token     # Your Twilio Auth Token
WHATSAPP_NUMBER=+1234567890      # Your verified WhatsApp Business number
```

**WhatsApp Setup Requirements:**
1. Twilio account with WhatsApp Business API access
2. Verified WhatsApp Business number
3. WhatsApp sandbox setup (for testing) or approved business account

## Web Interface Configuration

Many settings can be configured through the web interface at `/settings`. These settings are applied immediately without restarting the application.

### Configurable Settings

**Monitoring Settings:**
- Monitoring interval (hot-reloadable)
- Cooldown period
- Enable/disable WhatsApp notifications

**Logging Settings:**
- Log level (hot-reloadable)

**System Settings:**
- Various operational parameters

### Hot-Reloadable Settings

Settings marked as "hot-reloadable" take effect immediately:
- `monitoring_interval_minutes`
- `log_level`
- `enable_whatsapp`

Other settings require an application restart to take effect.

### Configuration Health Check

The web interface includes configuration health monitoring that checks:
- API key validity
- Service connectivity
- Configuration completeness
- Potential issues and warnings

## Configuration Validation

The application automatically validates configuration on startup:

### Validation Checks

1. **API Keys**: Checks for placeholder values
2. **Numeric Ranges**: Validates intervals and timeouts
3. **File Paths**: Ensures directories are writable
4. **Network Settings**: Validates host/port combinations
5. **Feature Dependencies**: Checks required settings for enabled features

### Validation Errors

Common validation errors and solutions:

```bash
# Invalid monitoring interval
Error: monitoring_interval_minutes must be between 1 and 60
Solution: Set MONITORING_INTERVAL_MINUTES to a value between 1-60

# Missing API key
Error: Alpha Vantage API key not configured
Solution: Set ALPHA_VANTAGE_API_KEY in .env file

# Invalid database path
Error: Cannot write to database directory
Solution: Check permissions on DATABASE_PATH directory
```

## Environment-Specific Configurations

### Development Configuration

`.env.development`:
```env
# Development settings
DEBUG=true
HOST=127.0.0.1
PORT=8000
LOG_LEVEL=DEBUG
MONITORING_INTERVAL_MINUTES=1

# Use sandbox/test APIs when possible
ALPHA_VANTAGE_API_KEY=demo
ENABLE_WHATSAPP=false
```

### Production Configuration

`.env.production`:
```env
# Production settings
DEBUG=false
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=WARNING

# Production monitoring intervals
MONITORING_INTERVAL_MINUTES=5
COOLDOWN_HOURS=3

# Production API keys (never commit these!)
ALPHA_VANTAGE_API_KEY=your_production_key
TWILIO_ACCOUNT_SID=your_production_sid
TWILIO_AUTH_TOKEN=your_production_token
WHATSAPP_NUMBER=+1234567890

# Enable all features
ENABLE_WHATSAPP=true
```

### Testing Configuration

`.env.test`:
```env
# Testing settings
DEBUG=true
LOG_LEVEL=DEBUG
DATABASE_PATH=./data/test_price_monitor.db

# Disable external services
ENABLE_WHATSAPP=false
MONITORING_INTERVAL_MINUTES=60

# Use demo/test keys
ALPHA_VANTAGE_API_KEY=demo
```

## Advanced Configuration

### Custom Database Path

```env
# Windows absolute path
DATABASE_PATH=C:\PriceMonitor\data\database.db

# Linux/macOS absolute path  
DATABASE_PATH=/opt/price-monitor/data/database.db

# Relative path (from application directory)
DATABASE_PATH=./data/price_monitor.db
```

### Custom Log Directory

The application automatically creates logs in the `logs/` directory. For custom paths:

1. Modify the logging configuration in `src/utils/logging_config.py`
2. Update log rotation scripts
3. Ensure proper permissions

### Multiple Environment Management

Use environment-specific configuration files:

```bash
# Development
cp .env.example .env.dev
# Edit .env.dev with development settings

# Production
cp .env.example .env.prod
# Edit .env.prod with production settings

# Load specific environment
export ENV_FILE=.env.prod
python main.py
```

### Container Configuration

For Docker deployment:

```yaml
# docker-compose.yml
environment:
  - DEBUG=false
  - HOST=0.0.0.0
  - PORT=8000
  - DATABASE_PATH=/app/data/database.db
  - LOG_LEVEL=INFO
env_file:
  - .env.production
```

### Scaling Configuration

For multiple instances:

```env
# Instance 1
PORT=8001
DATABASE_PATH=/shared/data/instance1.db

# Instance 2  
PORT=8002
DATABASE_PATH=/shared/data/instance2.db
```

### Security Configuration

```env
# Security settings
DEBUG=false                      # Never true in production
LOG_LEVEL=WARNING               # Minimize log data
HOST=127.0.0.1                 # Restrict to localhost if behind proxy

# Use environment variables for secrets (not .env file)
export TWILIO_AUTH_TOKEN="your_secret_token"
export ALPHA_VANTAGE_API_KEY="your_secret_key"
```

## Configuration Best Practices

### Security Best Practices

1. **Never commit secrets**: Use `.gitignore` to exclude `.env` files
2. **Use environment variables**: For sensitive data in production
3. **Rotate API keys**: Regularly update API keys
4. **Restrict access**: Use `HOST=127.0.0.1` when behind a proxy
5. **Disable debug**: Always set `DEBUG=false` in production

### Performance Best Practices

1. **Appropriate intervals**: Don't set monitoring too frequently
2. **Log level**: Use `WARNING` or `ERROR` in production
3. **Database path**: Use fast storage for database
4. **Resource monitoring**: Monitor CPU and memory usage

### Operational Best Practices

1. **Configuration validation**: Test configurations before deployment
2. **Backup configuration**: Keep backups of working configurations  
3. **Documentation**: Document custom configurations
4. **Version control**: Use separate configs for each environment
5. **Monitoring**: Monitor configuration health via web interface

## Configuration Examples

### High-Frequency Trading Setup

```env
# Aggressive monitoring for day trading
MONITORING_INTERVAL_MINUTES=1
COOLDOWN_HOURS=0.5
LOG_LEVEL=ERROR
ENABLE_WHATSAPP=true
```

### Conservative Long-Term Monitoring

```env
# Passive monitoring for long-term investments
MONITORING_INTERVAL_MINUTES=30
COOLDOWN_HOURS=12
LOG_LEVEL=WARNING
```

### Development with Mock Services

```env
# Development with mock data
DEBUG=true
LOG_LEVEL=DEBUG
MONITORING_INTERVAL_MINUTES=60
ENABLE_WHATSAPP=false
ALPHA_VANTAGE_API_KEY=demo
```

## Troubleshooting Configuration Issues

### Configuration Not Loading

**Problem**: Settings not taking effect

**Solutions:**
1. Check `.env` file syntax (no spaces around `=`)
2. Verify file is in application root directory
3. Restart application after changes
4. Check for system environment variable overrides

### Invalid Configuration Values

**Problem**: Validation errors on startup

**Solutions:**
1. Check value ranges and formats
2. Review configuration guide for valid options
3. Use web interface health check
4. Check logs for specific error messages

### Performance Issues

**Problem**: Application running slowly

**Solutions:**
1. Increase monitoring intervals
2. Reduce log level to `WARNING` or `ERROR`
3. Check database path is on fast storage
4. Monitor system resources

### API Issues

**Problem**: External API calls failing

**Solutions:**
1. Verify API keys are correct and active
2. Check API rate limits and usage
3. Test API endpoints manually
4. Review API documentation for changes

### Database Issues

**Problem**: Database connection or permission errors

**Solutions:**
1. Check database path permissions
2. Ensure parent directories exist
3. Verify disk space availability
4. Check SQLite installation

## Getting Help

If you need assistance with configuration:

1. Check the [Troubleshooting Guide](troubleshooting.md)
2. Use the Health Dashboard at `/health`
3. Review application logs in `logs/` directory
4. Verify settings in the web interface at `/settings`
5. Test with minimal configuration first