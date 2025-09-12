# Production Deployment Guide

This comprehensive guide provides step-by-step instructions for deploying the Price Monitor application in production environments with security best practices and reliability considerations.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Production Environment Setup](#production-environment-setup)
- [Security Configuration](#security-configuration)
- [Deployment Methods](#deployment-methods)
- [Service Management](#service-management)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Backup and Recovery](#backup-and-recovery)
- [Performance Tuning](#performance-tuning)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Minimum Production Requirements:**
- CPU: 1 vCPU (2+ vCPU recommended)
- RAM: 1 GB (2+ GB recommended)
- Storage: 5 GB free space (10+ GB recommended)
- Network: Stable internet connection
- OS: Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+ / macOS 11+

**Software Dependencies:**
- Python 3.8+ (Python 3.9+ recommended)
- SQLite 3.35+
- SSL/TLS certificates (for HTTPS)
- Reverse proxy (Nginx recommended)
- Process manager (systemd/pm2/supervisord)

### External Service Requirements

1. **Alpha Vantage API Key**
   - Free tier: 5 calls/minute, 500 calls/day
   - Premium recommended for production: $19.99+/month
   - Register at: https://www.alphavantage.co/

2. **Twilio WhatsApp API**
   - Sandbox: Free for testing
   - Production WhatsApp Business API: $20+ setup fee
   - Register at: https://console.twilio.com/

3. **Domain and SSL** (Optional but recommended)
   - Domain name for public access
   - SSL certificate (Let's Encrypt recommended)

## Production Environment Setup

### 1. Server Preparation

#### Linux (Ubuntu/Debian)

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required system packages
sudo apt install -y python3 python3-pip python3-venv git nginx certbot sqlite3

# Install security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades

# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
```

#### Windows Server

```powershell
# Install Python 3.9+
# Download from python.org and install with "Add to PATH" option

# Install Git
# Download from git-scm.com

# Install IIS or use built-in web server
# Enable IIS features via "Turn Windows features on or off"
```

### 2. Application User Setup (Linux)

```bash
# Create dedicated application user
sudo useradd -r -s /bin/false -m -d /opt/price-monitor priceuser

# Set secure permissions
sudo chmod 750 /opt/price-monitor
sudo chown priceuser:priceuser /opt/price-monitor
```

### 3. Application Installation

```bash
# Switch to application directory
cd /opt/price-monitor

# Clone repository (or upload files)
sudo -u priceuser git clone https://github.com/your-username/price-monitor.git .

# Create virtual environment
sudo -u priceuser python3 -m venv .venv

# Activate virtual environment
sudo -u priceuser /opt/price-monitor/.venv/bin/pip install --upgrade pip

# Install dependencies
sudo -u priceuser /opt/price-monitor/.venv/bin/pip install -r requirements.txt
```

### 4. Directory Structure Setup

```bash
# Create required directories
sudo -u priceuser mkdir -p /opt/price-monitor/{data,logs,backups,config}

# Set proper permissions
sudo chmod -R 750 /opt/price-monitor
sudo chown -R priceuser:priceuser /opt/price-monitor

# Create log rotation directories
sudo mkdir -p /var/log/price-monitor
sudo chown priceuser:priceuser /var/log/price-monitor
```

## Security Configuration

### 1. Environment Configuration

Create production `.env` file:

```bash
sudo -u priceuser cp /opt/price-monitor/.env.example /opt/price-monitor/.env
sudo -u priceuser chmod 600 /opt/price-monitor/.env
```

Production `.env` configuration:

```env
# =============================================================================
# PRODUCTION CONFIGURATION
# =============================================================================

# Server Configuration (Security: localhost only)
HOST=127.0.0.1
PORT=8000
DEBUG=false
LOG_LEVEL=WARNING

# Database Configuration (Absolute paths for production)
DATABASE_PATH=/opt/price-monitor/data/price_monitor.db

# API Keys (Replace with actual production keys)
ALPHA_VANTAGE_API_KEY=your_production_alpha_vantage_key
COINGECKO_API_ENABLED=true

# WhatsApp/Twilio Configuration
TWILIO_ACCOUNT_SID=your_production_twilio_sid
TWILIO_AUTH_TOKEN=your_production_twilio_token
WHATSAPP_NUMBER=your_production_whatsapp_number

# Production Monitoring Settings
MONITORING_INTERVAL_MINUTES=10
COOLDOWN_HOURS=6

# Notification Settings
ENABLE_WHATSAPP=true

# Security Headers
SECURE_HEADERS=true
CORS_ORIGINS=[]

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD=3600
```

### 2. File Permissions Security

```bash
# Secure application files
sudo chmod 644 /opt/price-monitor/*.py
sudo chmod 600 /opt/price-monitor/.env
sudo chmod 755 /opt/price-monitor/static
sudo chmod 644 /opt/price-monitor/static/*
sudo chmod 755 /opt/price-monitor/templates
sudo chmod 644 /opt/price-monitor/templates/*

# Secure data directories
sudo chmod 750 /opt/price-monitor/data
sudo chmod 750 /opt/price-monitor/logs
sudo chmod 750 /opt/price-monitor/backups

# Ensure ownership
sudo chown -R priceuser:priceuser /opt/price-monitor
```

### 3. Network Security

```bash
# Configure UFW firewall
sudo ufw deny 8000  # Block direct access to application port
sudo ufw allow 'Nginx Full'  # Allow HTTP/HTTPS through reverse proxy

# Additional security rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

## Deployment Methods

### Method 1: Systemd Service (Recommended for Linux)

Create systemd service file `/etc/systemd/system/price-monitor.service`:

```ini
[Unit]
Description=Price Monitor - WhatsApp Price Monitoring Application
Documentation=https://github.com/your-username/price-monitor
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=priceuser
Group=priceuser
WorkingDirectory=/opt/price-monitor
Environment=PATH=/opt/price-monitor/.venv/bin
ExecStart=/opt/price-monitor/.venv/bin/python main.py
ExecReload=/bin/kill -HUP $MAINPID

# Restart configuration
Restart=always
RestartSec=10
StartLimitInterval=60s
StartLimitBurst=3

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/price-monitor
CapabilityBoundingSet=
AmbientCapabilities=
SystemCallFilter=@system-service
SystemCallErrorNumber=EPERM

# Resource limits
MemoryLimit=512M
TasksMax=100

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=price-monitor

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable price-monitor

# Start service
sudo systemctl start price-monitor

# Check status
sudo systemctl status price-monitor

# View logs
sudo journalctl -u price-monitor -f
```

### Method 2: Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    sqlite3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -r -s /bin/false -m -u 1001 appuser

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=appuser:appuser . .

# Create required directories
RUN mkdir -p data logs backups && \
    chown -R appuser:appuser data logs backups

# Switch to app user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["python", "main.py"]
```

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  price-monitor:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: price-monitor
    restart: unless-stopped
    ports:
      - "127.0.0.1:8000:8000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./backups:/app/backups
      - ./.env:/app/.env:ro
    environment:
      - HOST=0.0.0.0
      - PORT=8000
      - DEBUG=false
      - LOG_LEVEL=WARNING
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    networks:
      - price-monitor-network

networks:
  price-monitor-network:
    driver: bridge
```

Deploy with Docker:

```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Update application
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Method 3: Windows Service

Create PowerShell script `install-service.ps1`:

```powershell
# Install NSSM (Non-Sucking Service Manager)
# Download from: https://nssm.cc/download

# Install service
nssm install "PriceMonitor" "C:\price-monitor\.venv\Scripts\python.exe"
nssm set "PriceMonitor" AppParameters "main.py"
nssm set "PriceMonitor" AppDirectory "C:\price-monitor"
nssm set "PriceMonitor" DisplayName "Price Monitor - WhatsApp Price Alerts"
nssm set "PriceMonitor" Description "Monitors cryptocurrency and stock prices, sends WhatsApp alerts"
nssm set "PriceMonitor" Start SERVICE_AUTO_START

# Configure logging
nssm set "PriceMonitor" AppStdout "C:\price-monitor\logs\service-output.log"
nssm set "PriceMonitor" AppStderr "C:\price-monitor\logs\service-error.log"

# Start service
nssm start "PriceMonitor"
```

## Service Management

### Systemd Commands (Linux)

```bash
# Service control
sudo systemctl start price-monitor      # Start service
sudo systemctl stop price-monitor       # Stop service
sudo systemctl restart price-monitor    # Restart service
sudo systemctl reload price-monitor     # Reload configuration

# Service status
sudo systemctl status price-monitor     # Check status
sudo systemctl is-active price-monitor  # Check if running
sudo systemctl is-enabled price-monitor # Check if enabled

# Logs
sudo journalctl -u price-monitor -f     # Follow logs
sudo journalctl -u price-monitor --since "1 hour ago"
sudo journalctl -u price-monitor --lines=100
```

### Docker Commands

```bash
# Container management
docker-compose -f docker-compose.prod.yml start
docker-compose -f docker-compose.prod.yml stop
docker-compose -f docker-compose.prod.yml restart

# Logs
docker-compose -f docker-compose.prod.yml logs -f
docker-compose -f docker-compose.prod.yml logs --tail=100

# Updates
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Reverse Proxy Configuration

### Nginx Configuration

Create `/etc/nginx/sites-available/price-monitor`:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=web:10m rate=60r/m;

upstream price_monitor {
    server 127.0.0.1:8000;
    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;

    # Logging
    access_log /var/log/nginx/price-monitor.access.log;
    error_log /var/log/nginx/price-monitor.error.log;

    # Static files
    location /static {
        alias /opt/price-monitor/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # Compress static assets
        gzip_static on;
        gzip_types text/css application/javascript image/svg+xml;
    }

    # API endpoints (with stricter rate limiting)
    location /api {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://price_monitor;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Web interface
    location / {
        limit_req zone=web burst=10 nodelay;
        
        proxy_pass http://price_monitor;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://price_monitor;
        access_log off;
    }
}
```

Enable the configuration:

```bash
# Test configuration
sudo nginx -t

# Enable site
sudo ln -s /etc/nginx/sites-available/price-monitor /etc/nginx/sites-enabled/

# Reload nginx
sudo systemctl reload nginx
```

### SSL Certificate Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring and Maintenance

### 1. Log Management

Configure logrotate `/etc/logrotate.d/price-monitor`:

```
/opt/price-monitor/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 priceuser priceuser
    postrotate
        systemctl reload price-monitor 2>/dev/null || true
    endscript
}

/var/log/nginx/price-monitor*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx 2>/dev/null || true
    endscript
}
```

### 2. Monitoring Scripts

Create monitoring script `/opt/price-monitor/scripts/health-check.sh`:

```bash
#!/bin/bash

# Health check script
HEALTH_URL="http://localhost:8000/health"
LOG_FILE="/var/log/price-monitor/health-check.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Check if service is responding
if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    echo "[$TIMESTAMP] SUCCESS: Service is healthy" >> "$LOG_FILE"
    exit 0
else
    echo "[$TIMESTAMP] ERROR: Service health check failed" >> "$LOG_FILE"
    
    # Try to restart service
    systemctl restart price-monitor
    sleep 30
    
    # Check again
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        echo "[$TIMESTAMP] RECOVERY: Service restarted successfully" >> "$LOG_FILE"
        exit 0
    else
        echo "[$TIMESTAMP] CRITICAL: Service restart failed" >> "$LOG_FILE"
        exit 1
    fi
fi
```

Set up cron job:

```bash
# Add to crontab
sudo crontab -e

# Check health every 5 minutes
*/5 * * * * /opt/price-monitor/scripts/health-check.sh
```

### 3. Performance Monitoring

Create performance monitoring script `/opt/price-monitor/scripts/performance-monitor.sh`:

```bash
#!/bin/bash

# Performance monitoring
PID=$(pgrep -f "python main.py")
LOG_FILE="/var/log/price-monitor/performance.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

if [ -n "$PID" ]; then
    # Get CPU and memory usage
    CPU=$(ps -p "$PID" -o %cpu --no-headers | tr -d ' ')
    MEM=$(ps -p "$PID" -o %mem --no-headers | tr -d ' ')
    RSS=$(ps -p "$PID" -o rss --no-headers | tr -d ' ')
    
    # Log performance metrics
    echo "[$TIMESTAMP] CPU: ${CPU}% MEM: ${MEM}% RSS: ${RSS}KB" >> "$LOG_FILE"
    
    # Alert if memory usage is high (>80%)
    if (( $(echo "$MEM > 80" | bc -l) )); then
        echo "[$TIMESTAMP] WARNING: High memory usage detected: ${MEM}%" >> "$LOG_FILE"
    fi
else
    echo "[$TIMESTAMP] ERROR: Price monitor process not found" >> "$LOG_FILE"
fi
```

## Backup and Recovery

### 1. Database Backup

Create backup script `/opt/price-monitor/scripts/backup.sh`:

```bash
#!/bin/bash

# Database backup script
DB_PATH="/opt/price-monitor/data/price_monitor.db"
BACKUP_DIR="/opt/price-monitor/backups"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/price_monitor_$TIMESTAMP.db"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$BACKUP_FILE"
    gzip "$BACKUP_FILE"
    echo "Backup created: $BACKUP_FILE.gz"
    
    # Keep only last 30 days of backups
    find "$BACKUP_DIR" -name "*.gz" -mtime +30 -delete
else
    echo "Database file not found: $DB_PATH"
    exit 1
fi
```

Schedule daily backups:

```bash
# Add to crontab
sudo crontab -e

# Daily backup at 2 AM
0 2 * * * /opt/price-monitor/scripts/backup.sh
```

### 2. Configuration Backup

Create configuration backup script `/opt/price-monitor/scripts/config-backup.sh`:

```bash
#!/bin/bash

# Configuration backup
CONFIG_DIR="/opt/price-monitor"
BACKUP_DIR="/opt/price-monitor/backups/config"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

mkdir -p "$BACKUP_DIR"

# Backup configuration files (without sensitive data)
tar -czf "$BACKUP_DIR/config_$TIMESTAMP.tar.gz" \
    -C "$CONFIG_DIR" \
    --exclude='.env' \
    --exclude='data/*' \
    --exclude='logs/*' \
    --exclude='backups/*' \
    --exclude='.venv/*' \
    .

echo "Configuration backup created: config_$TIMESTAMP.tar.gz"

# Keep only last 7 config backups
find "$BACKUP_DIR" -name "config_*.tar.gz" -mtime +7 -delete
```

### 3. Disaster Recovery

Create recovery documentation `/opt/price-monitor/RECOVERY.md`:

```markdown
# Disaster Recovery Procedures

## Database Recovery

1. Stop the service:
   ```bash
   sudo systemctl stop price-monitor
   ```

2. Restore from backup:
   ```bash
   cd /opt/price-monitor/backups
   gunzip -c price_monitor_YYYYMMDD_HHMMSS.db.gz > ../data/price_monitor.db
   chown priceuser:priceuser ../data/price_monitor.db
   ```

3. Start the service:
   ```bash
   sudo systemctl start price-monitor
   ```

## Full System Recovery

1. Install system dependencies
2. Create application user and directories
3. Restore configuration files
4. Restore database
5. Install Python dependencies
6. Configure and start services
```

## Performance Tuning

### 1. Database Optimization

```python
# Add to database.py for production optimizations
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = memory;
PRAGMA mmap_size = 268435456;  # 256MB
```

### 2. Application Tuning

Production configuration adjustments:

```env
# Reduce monitoring frequency in production
MONITORING_INTERVAL_MINUTES=15

# Increase cooldown to reduce spam
COOLDOWN_HOURS=12

# Optimize logging
LOG_LEVEL=ERROR

# Disable debug mode
DEBUG=false
```

### 3. System Resources

```bash
# Increase file descriptor limits
echo "priceuser soft nofile 65536" >> /etc/security/limits.conf
echo "priceuser hard nofile 65536" >> /etc/security/limits.conf

# Optimize kernel parameters
echo "net.core.somaxconn = 65536" >> /etc/sysctl.conf
echo "net.ipv4.ip_local_port_range = 1024 65000" >> /etc/sysctl.conf
sysctl -p
```

## Troubleshooting

### Common Issues

1. **Service won't start**
   ```bash
   # Check logs
   sudo journalctl -u price-monitor --no-pager
   
   # Check configuration
   sudo -u priceuser python3 -c "from src.config.settings import get_settings; print(get_settings())"
   ```

2. **Database permission errors**
   ```bash
   sudo chown priceuser:priceuser /opt/price-monitor/data/price_monitor.db
   sudo chmod 644 /opt/price-monitor/data/price_monitor.db
   ```

3. **API rate limiting**
   - Monitor API usage in logs
   - Increase monitoring intervals
   - Upgrade API plans if needed

4. **Memory issues**
   ```bash
   # Monitor memory usage
   ps aux | grep python
   
   # Restart service to free memory
   sudo systemctl restart price-monitor
   ```

### Log Analysis

```bash
# View recent errors
sudo journalctl -u price-monitor --since "1 hour ago" -p err

# Monitor in real-time
sudo tail -f /opt/price-monitor/logs/app.log

# Search for specific issues
grep -i "error\|exception\|fail" /opt/price-monitor/logs/app.log
```

## Security Checklist

- [ ] Application runs as non-root user
- [ ] File permissions properly configured (750/644)
- [ ] `.env` file has restrictive permissions (600)
- [ ] Firewall configured to block direct access to app port
- [ ] Reverse proxy configured with security headers
- [ ] SSL certificate installed and auto-renewing
- [ ] Regular security updates scheduled
- [ ] Log files regularly rotated
- [ ] Monitoring and alerting configured
- [ ] Backup system tested and verified

## Maintenance Schedule

**Daily:**
- Automated database backup
- Health check monitoring
- Log rotation

**Weekly:**
- Configuration backup
- Security update check
- Performance metrics review

**Monthly:**
- Full system backup
- SSL certificate renewal check
- Clean up old backups and logs
- Review monitoring alerts

**Quarterly:**
- Security audit
- Performance optimization review
- Disaster recovery test
- API usage and cost analysis