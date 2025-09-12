# User Manual - Price Monitor Application

This comprehensive user manual provides step-by-step instructions for using the Price Monitor application to track cryptocurrency and stock prices with WhatsApp notifications.

## Table of Contents

- [Getting Started](#getting-started)
- [Dashboard Overview](#dashboard-overview)
- [Managing Price Alerts](#managing-price-alerts)
- [Configuration Management](#configuration-management)
- [Health Monitoring](#health-monitoring)
- [Data Management & Backup](#data-management--backup)
- [Understanding Notifications](#understanding-notifications)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

## Getting Started

### First Time Setup

1. **Access the Application**
   - Open your web browser
   - Navigate to `http://localhost:8000`
   - You should see the Price Monitor dashboard

2. **Verify System Health**
   - Click on "Health" in the navigation menu
   - Ensure all system components show green status
   - If any components show red or yellow, refer to the troubleshooting section

3. **Configure API Keys**
   - Navigate to "Settings"
   - Check that your API keys are properly configured
   - See the Configuration Management section for details

### Navigation Overview

The application has four main sections:

- **Dashboard** (`/`): Main interface for managing alerts and monitoring
- **Settings** (`/settings`): Configuration management
- **Health** (`/health`): System status and component health
- **Data** (`/data`): Database management and backup tools

## Dashboard Overview

### Status Bar

The status bar at the top provides real-time information:

- **System Status**: Overall health (Healthy/Warning/Critical)
- **Active Alerts**: Number of enabled price alerts
- **Last Check**: When prices were last monitored
- **Next Check**: When the next monitoring cycle will occur

### Control Buttons

- **Start**: Begin automated price monitoring
- **Stop**: Pause automated price monitoring
- **Check Now**: Manually trigger price check for all alerts

### Quick Actions

The dashboard provides immediate access to:
- Create new price alerts
- View active alerts
- Monitor system status
- Access recent notifications

## Managing Price Alerts

### Creating a New Alert

1. **Navigate to Dashboard**
   - Go to the main dashboard (`/`)

2. **Complete Alert Form**
   - **Asset Symbol**: Enter the symbol (e.g., `AAPL` for Apple stock, `bitcoin` for Bitcoin)
   - **Target Price**: Enter the price threshold
   - **Condition**: Choose `>=` (above) or `<=` (below)
   - **Alert Name**: Optional descriptive name

3. **Submit Alert**
   - Click "Create Alert"
   - The new alert will appear in the alerts list below

### Supported Assets

#### Stocks
- Use standard ticker symbols: `AAPL`, `GOOGL`, `TSLA`, `MSFT`, etc.
- Examples:
  - `AAPL` - Apple Inc.
  - `GOOGL` - Alphabet Inc.
  - `TSLA` - Tesla Inc.
  - `SPY` - SPDR S&P 500 ETF

#### Cryptocurrencies
- Use CoinGecko IDs (usually lowercase): `bitcoin`, `ethereum`, `cardano`, etc.
- Common examples:
  - `bitcoin` - Bitcoin
  - `ethereum` - Ethereum
  - `cardano` - Cardano
  - `binancecoin` - Binance Coin
  - `solana` - Solana

*Tip: Visit CoinGecko.com to find the correct ID for any cryptocurrency*

### Managing Existing Alerts

#### Viewing Alerts
- All alerts are displayed in the "Your Price Alerts" section
- Each alert shows:
  - Asset symbol and name
  - Target price and condition
  - Current status (Active/Paused/Triggered)
  - Last triggered time
  - Current asset price

#### Alert Actions

**Edit Alert:**
1. Click the "Edit" button on any alert
2. Modify the target price, condition, or name
3. Click "Save Changes"

**Delete Alert:**
1. Click the "Delete" button on any alert
2. Confirm deletion in the popup dialog

**Pause/Resume Alert:**
1. Click the toggle switch to pause/resume an alert
2. Paused alerts won't trigger notifications but remain in your list

#### Alert States

- **Active** (🟢): Alert is monitoring and can trigger notifications
- **Paused** (⏸️): Alert is disabled and won't check prices
- **Triggered** (🔴): Alert recently fired, in cooldown period
- **Error** (❌): Issue with the alert (invalid symbol, API error, etc.)

### Alert Cooldown System

After an alert triggers:
- It enters a cooldown period (default: 3 hours)
- During cooldown, the alert won't trigger again even if conditions are met
- This prevents notification spam from price fluctuations
- Cooldown time is configurable in Settings

## Configuration Management

### Accessing Settings

1. Navigate to "Settings" from the main menu
2. The settings page shows:
   - Configuration health status
   - Available configuration sections
   - Save/reset controls

### Configuration Sections

#### Monitoring Settings

**Price Check Interval:**
- How often to check prices (1-60 minutes)
- Lower values = more frequent checks but higher API usage
- Default: 5 minutes

**Alert Cooldown Period:**
- Time between repeated notifications (1-168 hours)
- Prevents notification spam
- Default: 3 hours

#### API Configuration

**Alpha Vantage API:**
- Required for stock price monitoring
- Free tier: 5 calls/minute, 500 calls/day
- Status indicator shows connectivity

**CoinGecko API:**
- Used for cryptocurrency prices
- Free service, no API key required
- Can be disabled if not needed

#### WhatsApp Settings

**Enable WhatsApp Notifications:**
- Toggle to enable/disable all WhatsApp messages
- Useful for testing or temporary disabling

**Twilio Configuration:**
- Account SID and Auth Token (configured in .env file)
- WhatsApp phone number for notifications

### Configuration Status Icons

- 🔄 **Hot-Reload**: Changes take effect immediately
- 🔄 **Restart Required**: Requires application restart
- ⚠️ **Warning**: Configuration issue that needs attention
- ✅ **Healthy**: Configuration is valid and working

### Making Changes

1. **Modify Settings**: Change values in any configuration section
2. **Review Changes**: Unsaved changes are highlighted
3. **Save Changes**: Click "Save All Changes" to apply
4. **Reset if Needed**: Click "Reset Changes" to discard modifications

## Health Monitoring

### Health Dashboard Overview

The Health Dashboard (`/health`) provides comprehensive system monitoring with:

- Overall system status
- Individual component health
- Performance metrics
- Recent system events
- Auto-refresh capabilities

### Component Status

#### Database
- **Status**: Connection and query performance
- **Metrics**: Response time, total records, file size
- **Issues**: Connection errors, corruption, permission problems

#### External APIs
- **Alpha Vantage**: API connectivity, quota usage, response times
- **CoinGecko**: Service availability and response performance
- **Twilio/WhatsApp**: Messaging service connectivity

#### Application Services
- **Scheduler**: Background monitoring service status
- **Price Cache**: In-memory caching performance
- **Logging**: Log file health and disk usage

### Status Indicators

- 🟢 **Healthy**: Component functioning normally
- 🟡 **Warning**: Minor issues, service degraded but functional
- 🔴 **Critical**: Major issues, service unavailable or failing
- ⚫ **Unknown**: Status cannot be determined

### Auto-Refresh

- **Enabled by default**: Page refreshes every 30 seconds
- **Toggle**: Use the switch to enable/disable auto-refresh
- **Manual Refresh**: Click "Refresh" button for immediate update

### Understanding Metrics

#### Response Times
- **Good**: < 500ms
- **Acceptable**: 500ms - 2s
- **Slow**: > 2s

#### API Usage
- **Alpha Vantage**: Tracks daily quota usage
- **Rate Limits**: Shows current rate limiting status

#### System Resources
- **Memory**: Application memory usage
- **Disk**: Database and log file sizes

## Data Management & Backup

### Database Statistics

The Data Management page (`/data`) provides:

**Overview Metrics:**
- Total records in database
- Database file size
- Number of tables
- Storage efficiency metrics

**Table Details:**
- Records per table
- Table sizes
- Last modification times

### Backup Operations

#### Manual Backup
1. Navigate to Data Management page
2. Click "Create Backup Now"
3. Backup file will be created in `backups/` directory
4. Download link provided for immediate access

#### Automatic Backups
- **Schedule**: Daily at 2:00 AM (configurable)
- **Retention**: 30 days of backups kept automatically
- **Location**: `backups/` directory
- **Format**: Compressed SQLite database files

#### Backup Management
- **View Backups**: List all available backup files
- **Download**: Download specific backup files
- **Restore**: Restore database from backup (with confirmation)
- **Delete**: Remove old backup files manually

### Database Maintenance

#### Data Cleanup
- **Triggered Alerts**: Remove old triggered alert records
- **Log Cleanup**: Archive or delete old log entries  
- **Cache Cleanup**: Clear temporary price data

#### Health Checks
- **Integrity Check**: Verify database consistency
- **Performance Analysis**: Identify slow queries
- **Storage Optimization**: Reclaim unused space

#### Maintenance Actions
1. **Schedule**: Automatic maintenance runs weekly
2. **Manual**: Click "Run Maintenance Now"
3. **Reports**: View maintenance operation results

## Understanding Notifications

### WhatsApp Message Format

When an alert triggers, you'll receive a WhatsApp message with:

```
🚨 Price Alert Triggered!

Asset: Bitcoin (BTC)
Current Price: $45,250.00
Target: >= $45,000.00
Time: 2024-01-15 14:30 UTC

This alert will be paused for 3 hours to prevent spam.

Manage your alerts: http://localhost:8000
```

### Message Components

- **Alert Icon**: 🚨 for triggered alerts
- **Asset Information**: Name and symbol
- **Price Details**: Current vs target price
- **Timestamp**: When the alert triggered
- **Cooldown Notice**: Information about alert pause
- **Management Link**: Quick link back to dashboard

### Notification Delivery

#### Successful Delivery
- Message appears in WhatsApp immediately
- Delivery confirmation logged in application
- Alert status updates to "Triggered"

#### Delivery Issues
- **Network Problems**: Messages queued for retry
- **API Issues**: Logged as errors in Health Dashboard
- **Invalid Numbers**: Configuration warnings displayed

### Managing Notification Volume

#### Best Practices
- Set appropriate cooldown periods (3-12 hours)
- Use realistic price targets
- Monitor only essential assets
- Pause alerts during high volatility periods

#### Reducing Spam
- Increase cooldown periods for volatile assets
- Use percentage-based rather than absolute price targets
- Regularly review and clean up old alerts

## Best Practices

### Setting Up Effective Alerts

#### Stock Alerts
- **Support/Resistance Levels**: Set alerts at key technical levels
- **Earnings Dates**: Prepare alerts before earnings announcements
- **Volume Confirmation**: Monitor volume alongside price alerts

#### Cryptocurrency Alerts
- **Volatility Consideration**: Use wider price ranges
- **Market Hours**: Crypto markets are 24/7, consider timing
- **News Events**: Set alerts around major announcements

### Monitoring Strategy

#### Portfolio Management
- **Diversification**: Monitor various asset classes
- **Risk Management**: Set both upside and downside alerts
- **Regular Review**: Update alerts monthly based on market conditions

#### Performance Optimization
- **API Efficiency**: Don't over-monitor with short intervals
- **Resource Management**: Limit total number of active alerts
- **System Health**: Regular health dashboard reviews

### Security Considerations

#### Personal Data
- **API Keys**: Never share your API keys
- **WhatsApp Number**: Verify correct number configuration
- **Access Control**: Limit access to localhost in production

#### Best Practices
- **Regular Backups**: Weekly database backups
- **Software Updates**: Keep application updated
- **Log Monitoring**: Review error logs regularly

## Troubleshooting

### Common Issues

#### "No Alerts Showing"
**Symptoms**: Dashboard shows "No alerts found"
**Solutions**:
1. Check if you've created any alerts
2. Verify database connectivity in Health Dashboard
3. Try creating a test alert

#### "System Status: Critical"
**Symptoms**: Red status indicator, missing functionality
**Solutions**:
1. Visit Health Dashboard for detailed diagnostics
2. Check API key configuration
3. Verify internet connectivity
4. Restart the application if needed

#### "WhatsApp Messages Not Received"
**Symptoms**: Alerts trigger but no WhatsApp messages
**Solutions**:
1. Verify Twilio credentials in Settings
2. Check WhatsApp number format (+1234567890)
3. Review Twilio console for message delivery status
4. Test with Twilio sandbox first

#### "API Quota Exceeded"
**Symptoms**: Price updates stop, API errors in logs
**Solutions**:
1. Check API usage in Health Dashboard
2. Increase monitoring interval to reduce calls
3. Consider upgrading Alpha Vantage plan
4. Reduce number of stock alerts temporarily

### Performance Issues

#### "Slow Dashboard Loading"
**Possible Causes**:
- Large number of alerts (100+)
- Database performance issues
- Network connectivity problems

**Solutions**:
1. Check system resources in Health Dashboard
2. Run database maintenance
3. Consider reducing alert count
4. Verify internet speed

#### "High Memory Usage"
**Symptoms**: System becomes unresponsive
**Solutions**:
1. Restart the application
2. Check for memory leaks in logs
3. Reduce monitoring frequency temporarily
4. Consider system resource upgrade

### Getting Help

#### Built-in Diagnostics
1. **Health Dashboard**: Primary diagnostic tool
2. **Application Logs**: Check `logs/app.log`
3. **Browser Console**: F12 for JavaScript errors

#### Log Analysis
- **Error Logs**: Look for ERROR or CRITICAL entries
- **API Logs**: Check for rate limiting messages
- **Database Logs**: Verify database connectivity

#### Support Resources
- Application documentation in `docs/` folder
- Configuration examples in `.env.example`
- API documentation for external services

## FAQ

### General Questions

**Q: How many alerts can I create?**
A: There's no hard limit, but we recommend staying under 50 alerts for optimal performance.

**Q: Can I monitor international stocks?**
A: Yes, if they're available on Alpha Vantage. Use the appropriate exchange symbol (e.g., `SAP.DEX` for SAP on Frankfurt exchange).

**Q: Does the application work offline?**
A: No, internet connectivity is required for price data and WhatsApp notifications.

### Technical Questions

**Q: How often are prices updated?**
A: Prices are checked based on your monitoring interval setting (default: every 5 minutes).

**Q: Where is my data stored?**
A: All data is stored locally in a SQLite database file (`data/alerts.db`).

**Q: Can I export my alerts?**
A: Yes, use the Data Management page to create backups containing all your alerts.

### Configuration Questions

**Q: Do I need paid API subscriptions?**
A: Alpha Vantage free tier works for basic use. Twilio requires payment for production WhatsApp messaging.

**Q: Can I change the cooldown period per alert?**
A: Currently, cooldown period applies globally to all alerts. Per-alert cooldowns may be added in future versions.

**Q: How do I disable notifications temporarily?**
A: Toggle "Enable WhatsApp Notifications" to off in Settings, or pause individual alerts.

### Troubleshooting Questions

**Q: My cryptocurrency alerts aren't working**
A: Verify the exact CoinGecko ID (visit coingecko.com), and check CoinGecko API status in Health Dashboard.

**Q: I'm getting "API quota exceeded" errors**
A: Reduce your monitoring interval or upgrade your Alpha Vantage plan. Free tier allows 5 requests per minute.

**Q: The application won't start**
A: Check that all required files are present, Python 3.8+ is installed, and all dependencies are installed via `pip install -r requirements.txt`.

### Advanced Usage

**Q: Can I run multiple instances?**
A: Yes, but use different ports and database files to avoid conflicts.

**Q: Is there a mobile app?**
A: No mobile app, but the web interface is mobile-responsive and works well on smartphones.

**Q: Can I get notifications via email instead of WhatsApp?**
A: Currently only WhatsApp is supported. Email notifications may be added in future versions.

---

*For additional support, check the troubleshooting guide, review the application logs, or consult the developer documentation for more technical details.*