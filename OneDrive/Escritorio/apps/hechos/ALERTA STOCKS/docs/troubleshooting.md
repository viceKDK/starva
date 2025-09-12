# Troubleshooting Guide - Price Monitor Application

This comprehensive troubleshooting guide helps you diagnose and resolve common issues with the Price Monitor application, including installation problems, runtime errors, API failures, and performance issues.

## Table of Contents

- [Quick Diagnostic Checklist](#quick-diagnostic-checklist)
- [Installation Issues](#installation-issues)
- [Application Startup Problems](#application-startup-problems)
- [Alert Management Issues](#alert-management-issues)
- [API Integration Problems](#api-integration-problems)
- [WhatsApp Notification Issues](#whatsapp-notification-issues)
- [Database Problems](#database-problems)
- [Performance Issues](#performance-issues)
- [Configuration Problems](#configuration-problems)
- [Log Analysis](#log-analysis)
- [Network and Connectivity Issues](#network-and-connectivity-issues)
- [Advanced Troubleshooting](#advanced-troubleshooting)
- [Getting Additional Help](#getting-additional-help)

## Quick Diagnostic Checklist

Before diving into specific issues, run through this quick checklist:

### 🔍 System Status Check

1. **Check Application Status**
   ```bash
   # Windows
   tasklist | findstr python
   
   # Linux/macOS
   ps aux | grep python
   ```

2. **Verify Web Interface**
   - Open browser to `http://localhost:8000`
   - Check if dashboard loads

3. **Health Dashboard Check**
   - Navigate to `http://localhost:8000/health`
   - Review all component statuses

4. **Log File Review**
   ```bash
   # Check recent logs
   tail -50 logs/app.log
   
   # Check for errors
   grep -i "error\|exception\|fail" logs/app.log
   ```

### ⚡ Quick Fixes

1. **Restart Application**
   ```bash
   # Stop and restart
   Ctrl+C  # if running in terminal
   python main.py
   ```

2. **Clear Browser Cache**
   - Hard refresh: Ctrl+F5 (Windows) / Cmd+Shift+R (macOS)
   - Clear browser cache and cookies

3. **Check Internet Connection**
   ```bash
   # Test connectivity
   curl -I https://www.alphavantage.co
   curl -I https://api.coingecko.com
   ```

## Installation Issues

### Python Version Problems

**Issue**: Application won't start due to Python version incompatibility

**Symptoms**:
- `SyntaxError` messages during startup
- Import errors with modern Python features
- Application crashes immediately

**Solutions**:

1. **Check Python Version**
   ```bash
   python --version
   # Should be 3.8 or higher
   ```

2. **Install Correct Python Version**
   ```bash
   # Windows - download from python.org
   # Linux
   sudo apt install python3.9 python3.9-venv python3.9-pip
   
   # macOS
   brew install python@3.9
   ```

3. **Use Specific Python Version**
   ```bash
   # Create venv with specific version
   python3.9 -m venv .venv
   source .venv/bin/activate  # Linux/macOS
   # or
   .venv\Scripts\activate  # Windows
   ```

### Dependencies Installation Issues

**Issue**: Package installation fails or conflicts

**Symptoms**:
- `pip install -r requirements.txt` fails
- Import errors when starting application
- Version conflicts between packages

**Solutions**:

1. **Clean Virtual Environment**
   ```bash
   # Remove and recreate venv
   rm -rf .venv  # Linux/macOS
   # or
   rmdir /s .venv  # Windows
   
   python -m venv .venv
   source .venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

2. **Install with Verbose Output**
   ```bash
   pip install -r requirements.txt -v
   ```

3. **Install Packages Individually**
   ```bash
   pip install fastapi==0.104.1
   pip install uvicorn[standard]==0.24.0
   # Continue with each package...
   ```

4. **System-Specific Issues**
   ```bash
   # Linux - install build tools
   sudo apt install build-essential python3-dev
   
   # macOS - install Xcode tools
   xcode-select --install
   
   # Windows - install Visual C++ Build Tools
   # Download from Microsoft website
   ```

### Permission Issues

**Issue**: Permission denied errors during installation or runtime

**Symptoms**:
- `Permission denied` errors
- Cannot create files or directories
- Database access errors

**Solutions**:

1. **Fix Directory Permissions (Linux/macOS)**
   ```bash
   # Fix ownership
   sudo chown -R $USER:$USER /path/to/price-monitor
   
   # Set permissions
   chmod -R 755 /path/to/price-monitor
   chmod 644 .env
   ```

2. **Run as Administrator (Windows)**
   - Right-click Command Prompt → "Run as administrator"
   - Or use PowerShell as Administrator

3. **Check Database Permissions**
   ```bash
   # Ensure database directory is writable
   ls -la data/
   chmod 755 data/
   chmod 644 data/*.db
   ```

## Application Startup Problems

### Port Already in Use

**Issue**: Application fails to start because port 8000 is in use

**Symptoms**:
```
[Errno 98] Address already in use
OSError: [WinError 10048] Only one usage of each socket address
```

**Solutions**:

1. **Find Process Using Port**
   ```bash
   # Windows
   netstat -ano | findstr :8000
   
   # Linux/macOS
   lsof -i :8000
   ```

2. **Kill Process Using Port**
   ```bash
   # Windows (replace PID with actual process ID)
   taskkill /PID 1234 /F
   
   # Linux/macOS
   kill -9 PID
   ```

3. **Use Different Port**
   ```bash
   # Set different port in .env
   PORT=8001
   
   # Or set environment variable
   export PORT=8001
   python main.py
   ```

### Configuration File Issues

**Issue**: Application won't start due to missing or invalid configuration

**Symptoms**:
- `FileNotFoundError: .env file not found`
- Configuration validation errors
- API key errors during startup

**Solutions**:

1. **Create Configuration File**
   ```bash
   # Copy example file
   cp .env.example .env
   
   # Edit with your settings
   nano .env  # Linux/macOS
   notepad .env  # Windows
   ```

2. **Validate Configuration**
   ```bash
   # Test configuration loading
   python -c "from src.config.settings import get_settings; print(get_settings())"
   ```

3. **Fix Configuration Format**
   ```env
   # Correct format (no spaces around =)
   ALPHA_VANTAGE_API_KEY=your_key_here
   
   # Incorrect format
   ALPHA_VANTAGE_API_KEY = your_key_here
   ```

### Database Initialization Problems

**Issue**: Database fails to initialize on startup

**Symptoms**:
- SQLite database errors
- Table creation failures
- Permission denied on database file

**Solutions**:

1. **Check Database Directory**
   ```bash
   # Ensure directory exists and is writable
   mkdir -p data
   chmod 755 data
   ```

2. **Delete and Recreate Database**
   ```bash
   # Backup first if needed
   mv data/alerts.db data/alerts.db.backup
   
   # Restart application - database will be recreated
   python main.py
   ```

3. **Check Disk Space**
   ```bash
   # Linux/macOS
   df -h .
   
   # Windows
   dir
   ```

## Alert Management Issues

### Alerts Not Triggering

**Issue**: Price alerts don't trigger when conditions are met

**Symptoms**:
- Alert conditions met but no notifications
- Alert status shows "Active" but never triggers
- No entries in notification history

**Troubleshooting Steps**:

1. **Check Alert Configuration**
   - Verify asset symbol is correct
   - Confirm price threshold is reasonable
   - Ensure condition type is correct (>= vs <=)

2. **Verify Price Data**
   ```bash
   # Check recent logs for price fetches
   grep -i "price.*fetched" logs/app.log
   
   # Check API responses
   grep -i "api.*response" logs/app.log
   ```

3. **Check Cooldown Status**
   - Recently triggered alerts enter cooldown period
   - Default cooldown is 3 hours
   - Check "Last Triggered" time in dashboard

4. **Verify Scheduler Status**
   ```bash
   # Check if scheduler is running
   curl http://localhost:8000/api/scheduler/status
   ```

**Solutions**:

1. **Restart Monitoring**
   ```bash
   curl -X POST http://localhost:8000/api/scheduler/restart
   ```

2. **Trigger Manual Check**
   ```bash
   curl -X POST http://localhost:8000/api/scheduler/check
   ```

3. **Reset Alert Cooldown**
   - Delete and recreate the alert
   - Or wait for cooldown period to expire

### Invalid Asset Symbols

**Issue**: Alerts fail due to invalid or unsupported asset symbols

**Symptoms**:
- "Asset not found" errors
- API errors for specific symbols
- Alerts showing error status

**Solutions**:

1. **Verify Stock Symbols**
   - Use official ticker symbols (e.g., "AAPL", "GOOGL")
   - Check Alpha Vantage symbol directory
   - Test symbol manually: `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=demo`

2. **Verify Crypto Symbols**
   - Use CoinGecko IDs (e.g., "bitcoin", "ethereum")
   - Visit coingecko.com to find correct IDs
   - Test: `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`

3. **Check Asset Type Match**
   - Ensure stock symbols use asset_type="stock"
   - Ensure crypto IDs use asset_type="crypto"

### Alert Creation Fails

**Issue**: Unable to create new alerts

**Symptoms**:
- Form submission fails
- Validation errors
- Database insertion errors

**Solutions**:

1. **Check Form Validation**
   ```bash
   # Test alert creation via API
   curl -X POST "http://localhost:8000/alerts/" \
     -d "asset_symbol=AAPL&asset_type=stock&condition_type=>=&threshold_price=150.00"
   ```

2. **Validate Input Data**
   - Asset symbol: 1-20 characters, alphanumeric
   - Asset type: must be "stock" or "crypto"  
   - Condition type: must be ">=" or "<="
   - Threshold price: must be positive number

3. **Check Database Connectivity**
   ```bash
   # Test database connection
   curl http://localhost:8000/health/detailed
   ```

## API Integration Problems

### Alpha Vantage API Issues

**Issue**: Stock price data not updating or API errors

**Symptoms**:
- "API quota exceeded" errors
- Stock prices showing as stale or not updating
- 5 calls per minute exceeded messages

**Solutions**:

1. **Check API Key**
   ```bash
   # Test API key directly
   curl "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=YOUR_API_KEY"
   ```

2. **Monitor API Usage**
   - Free tier: 5 calls/minute, 500 calls/day
   - Check current usage in Health dashboard
   - Consider upgrading to premium plan

3. **Adjust Monitoring Frequency**
   ```bash
   # Reduce monitoring interval
   curl -X PUT "http://localhost:8000/api/config/setting" \
     -H "Content-Type: application/json" \
     -d '{"key": "monitoring_interval_minutes", "value": 15}'
   ```

4. **Reduce Number of Stock Alerts**
   - Temporarily disable some stock alerts
   - Focus on most important assets

### CoinGecko API Issues

**Issue**: Cryptocurrency price data not updating

**Symptoms**:
- Crypto prices not updating
- CoinGecko API connection errors
- Invalid cryptocurrency IDs

**Solutions**:

1. **Test CoinGecko Connectivity**
   ```bash
   curl "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
   ```

2. **Verify Cryptocurrency IDs**
   - Use exact CoinGecko IDs (usually lowercase)
   - Common examples: bitcoin, ethereum, cardano, binancecoin
   - Find IDs at: https://api.coingecko.com/api/v3/coins/list

3. **Check API Status**
   - CoinGecko doesn't require API key for basic usage
   - Check CoinGecko status: https://status.coingecko.com/

### Network Connectivity Problems

**Issue**: External API calls fail due to network issues

**Symptoms**:
- Timeout errors
- DNS resolution failures
- Connection refused errors

**Solutions**:

1. **Test Internet Connectivity**
   ```bash
   # Test basic connectivity
   ping 8.8.8.8
   
   # Test DNS resolution
   nslookup www.alphavantage.co
   nslookup api.coingecko.com
   ```

2. **Check Firewall Settings**
   ```bash
   # Ensure outbound HTTPS (443) is allowed
   curl -I https://www.alphavantage.co
   curl -I https://api.coingecko.com
   ```

3. **Configure Proxy (if needed)**
   ```env
   # Add to .env file if behind corporate proxy
   HTTP_PROXY=http://proxy.company.com:8080
   HTTPS_PROXY=http://proxy.company.com:8080
   ```

## WhatsApp Notification Issues

### Messages Not Being Sent

**Issue**: WhatsApp notifications are not being delivered

**Symptoms**:
- Alerts trigger but no WhatsApp messages
- Twilio connection errors
- "WhatsApp notifications disabled" messages

**Troubleshooting Steps**:

1. **Check WhatsApp Configuration**
   ```bash
   # Verify configuration
   curl http://localhost:8000/api/config/health
   ```

2. **Verify Twilio Credentials**
   - Check Account SID format (starts with "AC")
   - Verify Auth Token is correct
   - Test credentials in Twilio Console

3. **Check Phone Number Format**
   ```env
   # Correct format with country code
   WHATSAPP_NUMBER=+1234567890
   
   # Incorrect formats
   WHATSAPP_NUMBER=1234567890
   WHATSAPP_NUMBER=234-567-890
   ```

**Solutions**:

1. **Test Twilio Connection**
   ```bash
   # Check Twilio API directly (replace with your credentials)
   curl -X GET "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json" \
     -u YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN
   ```

2. **Verify Sandbox Setup**
   - For testing: Use Twilio Sandbox number
   - Send "join <sandbox-code>" to Twilio's WhatsApp number
   - Check sandbox status in Twilio Console

3. **Check WhatsApp Business API**
   - Production WhatsApp requires approved Business account
   - Verify WhatsApp number is approved for business messaging
   - Check message templates (if required)

### Message Delivery Failures

**Issue**: Messages are sent but not delivered

**Symptoms**:
- Twilio shows "sent" but messages don't arrive
- Delivery status shows "failed" or "undelivered"
- Long delays in message delivery

**Solutions**:

1. **Check Twilio Message Logs**
   - Login to Twilio Console
   - Check Message logs for delivery status
   - Look for error codes and descriptions

2. **Verify Phone Number**
   - Ensure recipient number is correct
   - Verify phone can receive WhatsApp messages
   - Test with different phone number

3. **Check Message Content**
   - Avoid URLs or spammy content
   - Keep messages under character limits
   - Use approved message templates (for business accounts)

### Rate Limiting Issues

**Issue**: WhatsApp messages limited by Twilio rate limits

**Symptoms**:
- "Rate limit exceeded" errors
- Messages queued but not sent
- Twilio 429 errors in logs

**Solutions**:

1. **Implement Message Queuing**
   - Application should handle rate limiting gracefully
   - Check for built-in retry mechanisms

2. **Reduce Alert Frequency**
   - Increase cooldown periods
   - Reduce number of active alerts
   - Group similar alerts

3. **Upgrade Twilio Plan**
   - Higher tier plans have higher rate limits
   - Check current limits in Twilio Console

## Database Problems

### Database Corruption

**Issue**: Database file is corrupted or inaccessible

**Symptoms**:
- "Database is locked" errors
- SQLite corruption errors  
- Application crashes when accessing database

**Solutions**:

1. **Check Database Integrity**
   ```bash
   # Test database file
   sqlite3 data/alerts.db "PRAGMA integrity_check;"
   ```

2. **Backup and Restore**
   ```bash
   # Create backup if possible
   cp data/alerts.db data/alerts.db.backup
   
   # Try to repair
   sqlite3 data/alerts.db ".recover" > recovered.sql
   sqlite3 data/alerts_new.db < recovered.sql
   ```

3. **Start Fresh (Last Resort)**
   ```bash
   # Backup data first
   mv data/alerts.db data/alerts.db.corrupted
   
   # Application will create new database on restart
   python main.py
   ```

### Database Connection Issues

**Issue**: Cannot connect to database file

**Symptoms**:
- "Unable to open database file" errors
- Permission denied on database operations
- Database timeouts

**Solutions**:

1. **Check File Permissions**
   ```bash
   # Fix permissions
   chmod 644 data/alerts.db
   chmod 755 data/
   ```

2. **Check Disk Space**
   ```bash
   # Linux/macOS
   df -h data/
   
   # Windows
   dir data\
   ```

3. **Close Existing Connections**
   ```bash
   # Kill any hanging processes
   fuser data/alerts.db  # Linux
   lsof data/alerts.db   # macOS
   ```

### Database Performance Issues

**Issue**: Slow database queries or operations

**Symptoms**:
- Slow dashboard loading
- Timeout errors on database operations
- High CPU usage during database access

**Solutions**:

1. **Run Database Maintenance**
   ```bash
   # Via API
   curl -X POST "http://localhost:8000/api/data/maintenance"
   
   # Or manually
   sqlite3 data/alerts.db "VACUUM;"
   sqlite3 data/alerts.db "REINDEX;"
   ```

2. **Clean Up Old Data**
   ```bash
   # Remove old triggered alerts
   curl -X POST "http://localhost:8000/api/data/cleanup?retention_days=30"
   ```

3. **Check Database Size**
   ```bash
   ls -lh data/alerts.db
   # Consider archiving if > 100MB
   ```

## Performance Issues

### High Memory Usage

**Issue**: Application consuming excessive memory

**Symptoms**:
- System running out of memory
- Application becoming unresponsive
- OOM (Out of Memory) errors

**Solutions**:

1. **Monitor Memory Usage**
   ```bash
   # Linux/macOS
   ps aux | grep python
   top -p PID
   
   # Windows
   tasklist | findstr python
   ```

2. **Restart Application**
   ```bash
   # Quick fix - restart application
   # For production, set up automatic restarts
   ```

3. **Reduce Monitoring Frequency**
   ```bash
   # Increase interval to reduce memory pressure
   curl -X PUT "http://localhost:8000/api/config/setting" \
     -H "Content-Type: application/json" \
     -d '{"key": "monitoring_interval_minutes", "value": 30}'
   ```

4. **Limit Active Alerts**
   - Disable unused alerts
   - Consider archiving old alerts

### High CPU Usage

**Issue**: Application using excessive CPU resources

**Symptoms**:
- High CPU usage during monitoring cycles
- System becomes sluggish
- Fan running constantly

**Solutions**:

1. **Check Monitoring Interval**
   - Increase monitoring interval
   - Reduce API call frequency

2. **Profile Performance**
   ```bash
   # Check scheduler activity
   curl http://localhost:8000/api/scheduler/status
   
   # Review logs for performance issues
   grep -i "slow\|timeout" logs/app.log
   ```

3. **Optimize Alert Count**
   - Remove duplicate or similar alerts
   - Focus on most important assets

### Slow Response Times

**Issue**: Web interface or API responses are slow

**Symptoms**:
- Dashboard takes long time to load
- API calls timing out
- Browser shows loading spinners for extended periods

**Solutions**:

1. **Check System Resources**
   ```bash
   # Monitor system load
   top  # Linux/macOS
   # Task Manager on Windows
   ```

2. **Clear Browser Cache**
   - Hard refresh: Ctrl+F5
   - Clear all browser data
   - Try different browser

3. **Check Network Latency**
   ```bash
   # Test local network
   ping localhost
   curl -w "@curl-format.txt" http://localhost:8000/health
   ```

4. **Database Optimization**
   - Run database maintenance
   - Clean up old data
   - Check for database locks

## Configuration Problems

### Environment Variables Not Loading

**Issue**: Configuration settings from .env file not being applied

**Symptoms**:
- Default values used instead of .env values
- Configuration validation errors
- API keys not recognized

**Solutions**:

1. **Verify .env File Location**
   ```bash
   # Must be in application root directory
   ls -la .env
   ```

2. **Check .env File Format**
   ```env
   # Correct format (no spaces around =)
   DEBUG=False
   PORT=8000
   ALPHA_VANTAGE_API_KEY=your_key_here
   
   # Incorrect format
   DEBUG = False
   PORT = 8000
   ```

3. **Test Configuration Loading**
   ```bash
   python -c "
   from src.config.settings import get_settings
   settings = get_settings()
   print(f'Debug: {settings.debug}')
   print(f'Port: {settings.port}')
   "
   ```

### Invalid Configuration Values

**Issue**: Configuration validation fails

**Symptoms**:
- Startup errors about invalid configuration
- Settings page shows validation errors
- Features not working as expected

**Solutions**:

1. **Check Value Ranges**
   ```env
   # Valid ranges
   MONITORING_INTERVAL_MINUTES=5    # 1-60
   COOLDOWN_HOURS=3                 # 1-168
   PORT=8000                        # 1024-65535
   DEBUG=False                      # true/false
   ```

2. **Validate Individual Settings**
   ```bash
   curl -X POST "http://localhost:8000/api/config/validate" \
     -H "Content-Type: application/json" \
     -d '{"key": "monitoring_interval_minutes", "value": 5}'
   ```

3. **Reset to Defaults**
   ```bash
   # Backup current config
   cp .env .env.backup
   
   # Copy defaults
   cp .env.example .env
   
   # Edit with your values
   ```

## Log Analysis

### Understanding Log Levels

The application uses structured logging with different levels:

- **DEBUG**: Detailed information for debugging
- **INFO**: General information about application operation
- **WARNING**: Something unexpected but not critical
- **ERROR**: Serious problem that needs attention
- **CRITICAL**: Very serious error that may stop the application

### Common Log Patterns

1. **Normal Operation**
   ```
   INFO - Price monitoring cycle completed successfully
   INFO - Alert checked: AAPL (stock) - condition not met
   INFO - WhatsApp notification sent successfully
   ```

2. **API Issues**
   ```
   ERROR - Alpha Vantage API rate limit exceeded
   WARNING - CoinGecko API response delayed (5.2s)
   ERROR - Failed to fetch price for INVALID_SYMBOL
   ```

3. **Database Issues**
   ```
   ERROR - Database connection failed: database is locked
   WARNING - Database query slow (2.3s): SELECT * FROM alerts
   INFO - Database maintenance completed successfully
   ```

4. **Configuration Issues**
   ```
   WARNING - Alpha Vantage API key not configured
   ERROR - Invalid monitoring interval: must be 1-60 minutes
   INFO - Configuration updated successfully
   ```

### Log Analysis Commands

```bash
# Recent errors
grep -i "error" logs/app.log | tail -20

# API issues
grep -i "api\|rate\|limit" logs/app.log

# Database issues
grep -i "database\|sqlite" logs/app.log

# Performance issues
grep -i "slow\|timeout\|latency" logs/app.log

# Notification issues
grep -i "whatsapp\|twilio\|notification" logs/app.log

# Follow logs in real-time
tail -f logs/app.log

# Search specific time range
grep "2025-08-28 12:" logs/app.log
```

## Network and Connectivity Issues

### Firewall Problems

**Issue**: Firewall blocking external connections

**Symptoms**:
- API timeout errors
- Cannot reach external services
- Connection refused errors

**Solutions**:

1. **Check Firewall Rules**
   ```bash
   # Linux
   sudo ufw status
   sudo iptables -L
   
   # Windows
   # Check Windows Defender Firewall settings
   ```

2. **Allow Outbound HTTPS**
   ```bash
   # Linux
   sudo ufw allow out 443
   
   # Windows
   # Add rule in Windows Firewall for outbound port 443
   ```

3. **Test Specific Endpoints**
   ```bash
   # Test Alpha Vantage
   curl -v https://www.alphavantage.co
   
   # Test CoinGecko
   curl -v https://api.coingecko.com
   
   # Test Twilio
   curl -v https://api.twilio.com
   ```

### Proxy Configuration

**Issue**: Application behind corporate proxy

**Symptoms**:
- External API calls fail
- Certificate validation errors
- Timeout errors for external connections

**Solutions**:

1. **Configure Proxy Settings**
   ```env
   # Add to .env file
   HTTP_PROXY=http://proxy.company.com:8080
   HTTPS_PROXY=http://proxy.company.com:8080
   NO_PROXY=localhost,127.0.0.1
   ```

2. **Test Proxy Configuration**
   ```bash
   # Test with curl
   curl --proxy http://proxy.company.com:8080 https://www.alphavantage.co
   ```

3. **Handle SSL Certificates**
   ```bash
   # If corporate proxy uses custom certificates
   # Add certificate to system trust store
   # Or disable SSL verification (not recommended for production)
   ```

### DNS Resolution Issues

**Issue**: Cannot resolve external API hostnames

**Symptoms**:
- "Name or service not known" errors
- DNS lookup failures
- Intermittent connectivity issues

**Solutions**:

1. **Test DNS Resolution**
   ```bash
   nslookup www.alphavantage.co
   nslookup api.coingecko.com
   dig www.alphavantage.co
   ```

2. **Change DNS Servers**
   ```bash
   # Linux - edit /etc/resolv.conf
   nameserver 8.8.8.8
   nameserver 1.1.1.1
   
   # Windows - change in Network settings
   # Use Google DNS (8.8.8.8, 8.8.4.4) or Cloudflare (1.1.1.1)
   ```

3. **Flush DNS Cache**
   ```bash
   # Windows
   ipconfig /flushdns
   
   # Linux
   sudo systemd-resolve --flush-caches
   
   # macOS
   sudo dscacheutil -flushcache
   ```

## Advanced Troubleshooting

### Debug Mode

Enable debug mode for detailed troubleshooting:

1. **Enable Debug Logging**
   ```env
   # In .env file
   DEBUG=True
   LOG_LEVEL=DEBUG
   ```

2. **Restart Application**
   ```bash
   python main.py
   ```

3. **Review Debug Logs**
   ```bash
   tail -f logs/app.log | grep DEBUG
   ```

### Performance Profiling

Profile application performance:

1. **Monitor System Resources**
   ```bash
   # Continuous monitoring
   watch -n 5 'ps aux | grep python'
   
   # Memory usage over time
   while true; do
     ps -o pid,vsz,rss,comm -p PID
     sleep 5
   done
   ```

2. **API Response Times**
   ```bash
   # Test API response times
   curl -w "@curl-format.txt" http://localhost:8000/api/scheduler/status
   curl -w "@curl-format.txt" http://localhost:8000/alerts/
   ```

3. **Database Performance**
   ```bash
   # Time database operations
   time sqlite3 data/alerts.db "SELECT COUNT(*) FROM alerts;"
   ```

### Application State Analysis

Analyze application internal state:

1. **Check Scheduler State**
   ```bash
   curl -s http://localhost:8000/api/scheduler/status | jq '.'
   ```

2. **Review Configuration State**
   ```bash
   curl -s http://localhost:8000/api/config/health | jq '.'
   ```

3. **Examine Database State**
   ```bash
   curl -s http://localhost:8000/api/data/stats | jq '.'
   ```

### Thread and Process Analysis

Analyze application threading and processes:

1. **Check Process Tree**
   ```bash
   # Linux/macOS
   pstree -p PID
   
   # Windows
   wmic process where "ParentProcessId=PID" get ProcessId,Name
   ```

2. **Monitor Thread Activity**
   ```bash
   # Linux
   top -H -p PID
   
   # Monitor file handles
   lsof -p PID
   ```

## Getting Additional Help

### Built-in Diagnostics

1. **Health Dashboard**
   - Visit `http://localhost:8000/health`
   - Review all component statuses
   - Check recent health history

2. **Configuration Health**
   - Visit `http://localhost:8000/settings`
   - Review configuration warnings
   - Validate all settings

3. **API Diagnostics**
   ```bash
   # Test all major endpoints
   curl http://localhost:8000/health/detailed
   curl http://localhost:8000/api/scheduler/status
   curl http://localhost:8000/api/config/health
   curl http://localhost:8000/alerts/stats
   ```

### Collecting Diagnostic Information

When seeking help, collect this information:

1. **System Information**
   ```bash
   # Operating system
   uname -a  # Linux/macOS
   systeminfo  # Windows
   
   # Python version
   python --version
   
   # Package versions
   pip list
   ```

2. **Application Logs**
   ```bash
   # Recent logs (last 100 lines)
   tail -100 logs/app.log > diagnostic_logs.txt
   
   # Error logs only
   grep -i "error\|exception\|critical" logs/app.log > error_logs.txt
   ```

3. **Configuration (sanitized)**
   ```bash
   # Remove sensitive data before sharing
   grep -v -i "key\|token\|password\|secret" .env > config_sanitized.txt
   ```

4. **Health Status**
   ```bash
   curl -s http://localhost:8000/health/detailed > health_status.json
   curl -s http://localhost:8000/api/scheduler/status > scheduler_status.json
   ```

### Community Resources

1. **Documentation**
   - Review all documentation in `docs/` directory
   - Check FAQ in user manual
   - Review API documentation for integration issues

2. **Common Solutions Repository**
   - Check GitHub Issues for similar problems
   - Review closed issues for solutions
   - Search for error messages

3. **External Resources**
   - FastAPI documentation: https://fastapi.tiangolo.com/
   - Alpha Vantage API documentation: https://www.alphavantage.co/documentation/
   - CoinGecko API documentation: https://www.coingecko.com/en/api
   - Twilio WhatsApp API: https://www.twilio.com/docs/whatsapp

### Professional Support

For complex issues or production environments:

1. **System Administrator**
   - Involve system administrator for server-related issues
   - Check system logs and monitoring tools
   - Review infrastructure and networking

2. **API Provider Support**
   - Contact Alpha Vantage support for API issues
   - Reach out to Twilio support for WhatsApp problems
   - Check service status pages for outages

3. **Development Support**
   - Engage Python/FastAPI developers for code issues
   - Database administrators for SQLite problems
   - Network administrators for connectivity issues

---

*Remember to always backup your data before attempting major troubleshooting steps, and test solutions in a development environment when possible.*