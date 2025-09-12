# Installation Guide

This guide provides detailed instructions for installing and setting up the Price Monitor application in various environments.

## Table of Contents

- [System Requirements](#system-requirements)
- [Installation Methods](#installation-methods)
- [Basic Installation](#basic-installation)
- [Production Deployment](#production-deployment)
- [Docker Installation](#docker-installation)
- [Post-Installation Setup](#post-installation-setup)
- [Verification](#verification)

## System Requirements

### Minimum Requirements

- **Python**: 3.8 or higher
- **RAM**: 512 MB available memory
- **Storage**: 1 GB free disk space
- **Network**: Internet connection for API access

### Recommended Requirements

- **Python**: 3.9 or higher
- **RAM**: 2 GB available memory
- **Storage**: 5 GB free disk space (for logs and backups)
- **OS**: Windows 10/11, Ubuntu 20.04+, macOS 11+

### Dependencies

The application will automatically install the following Python packages:

```
fastapi>=0.104.1
uvicorn[standard]>=0.24.0
jinja2>=3.1.2
python-multipart>=0.0.6
aiosqlite>=0.19.0
httpx>=0.25.0
pydantic>=2.4.0
pydantic-settings>=2.0.0
python-dotenv>=1.0.0
apscheduler>=3.10.4
twilio>=8.11.0
psutil>=5.9.0
```

## Installation Methods

Choose the installation method that best fits your needs:

1. **Basic Installation**: For local development and testing
2. **Production Deployment**: For production servers
3. **Docker Installation**: For containerized deployment

## Basic Installation

### Step 1: Prepare Your System

#### Windows

1. **Install Python**
   - Download Python 3.9+ from [python.org](https://python.org)
   - During installation, check "Add Python to PATH"
   - Verify installation: `python --version`

2. **Install Git** (optional but recommended)
   - Download from [git-scm.com](https://git-scm.com)
   - Use default installation settings

#### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install Python and pip
sudo apt install python3 python3-pip python3-venv git

# Verify installation
python3 --version
pip3 --version
```

#### macOS

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python
brew install python git

# Verify installation
python3 --version
pip3 --version
```

### Step 2: Get the Application

#### Option A: Clone from Repository

```bash
git clone <your-repository-url>
cd finanzas
```

#### Option B: Download ZIP

1. Download the source code as a ZIP file
2. Extract to a directory (e.g., `C:\price-monitor` or `/opt/price-monitor`)
3. Navigate to the extracted directory

### Step 3: Set Up Virtual Environment

#### Windows

```cmd
# Create virtual environment
python -m venv .venv

# Activate virtual environment
.venv\Scripts\activate

# Upgrade pip
python -m pip install --upgrade pip
```

#### Linux/macOS

```bash
# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Upgrade pip
pip install --upgrade pip
```

### Step 4: Install Dependencies

```bash
# Install all required packages
pip install -r requirements.txt
```

### Step 5: Configuration

```bash
# Copy example configuration
cp .env.example .env

# Edit configuration file
# Windows: notepad .env
# Linux/macOS: nano .env
```

Configure at minimum:
- `ALPHA_VANTAGE_API_KEY`
- `TWILIO_ACCOUNT_SID` (if using WhatsApp)
- `TWILIO_AUTH_TOKEN` (if using WhatsApp)
- `WHATSAPP_NUMBER` (if using WhatsApp)

### Step 6: Initialize Database

```bash
# The database will be automatically initialized on first run
python main.py
```

## Production Deployment

### Step 1: System Preparation

#### Create Application User (Linux)

```bash
# Create dedicated user
sudo useradd -r -s /bin/false -d /opt/price-monitor priceuser

# Create application directory
sudo mkdir -p /opt/price-monitor
sudo chown priceuser:priceuser /opt/price-monitor
```

#### Secure the Installation

```bash
# Set proper permissions
sudo chmod 750 /opt/price-monitor
sudo chown -R priceuser:priceuser /opt/price-monitor
```

### Step 2: Production Configuration

Create a production `.env` file:

```env
# Production settings
DEBUG=false
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=WARNING

# Database (use absolute path)
DATABASE_PATH=/opt/price-monitor/data/price_monitor.db

# Security
SECRET_KEY=your-secret-key-here

# Monitoring (production intervals)
MONITORING_INTERVAL_MINUTES=5
COOLDOWN_HOURS=3

# API Keys
ALPHA_VANTAGE_API_KEY=your_production_api_key
TWILIO_ACCOUNT_SID=your_production_sid
TWILIO_AUTH_TOKEN=your_production_token
WHATSAPP_NUMBER=+1234567890

# Features
ENABLE_WHATSAPP=true
```

### Step 3: Create Systemd Service (Linux)

Create `/etc/systemd/system/price-monitor.service`:

```ini
[Unit]
Description=Price Monitor Application
After=network.target

[Service]
Type=simple
User=priceuser
Group=priceuser
WorkingDirectory=/opt/price-monitor
Environment=PATH=/opt/price-monitor/.venv/bin
ExecStart=/opt/price-monitor/.venv/bin/python main.py
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/price-monitor

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable price-monitor
sudo systemctl start price-monitor

# Check status
sudo systemctl status price-monitor
```

### Step 4: Reverse Proxy Setup (Optional)

#### Nginx Configuration

Create `/etc/nginx/sites-available/price-monitor`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static {
        alias /opt/price-monitor/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/price-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Docker Installation

### Step 1: Create Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p data logs backups

# Expose port
EXPOSE 8000

# Run application
CMD ["python", "main.py"]
```

### Step 2: Create Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  price-monitor:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./backups:/app/backups
    environment:
      - DEBUG=false
      - HOST=0.0.0.0
      - PORT=8000
      - DATABASE_PATH=/app/data/price_monitor.db
      - LOG_LEVEL=INFO
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Step 3: Deploy with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f price-monitor

# Stop
docker-compose down
```

## Post-Installation Setup

### 1. Create Directories

Ensure these directories exist and have proper permissions:

```bash
mkdir -p data logs backups
```

### 2. Set Up Log Rotation (Linux)

Create `/etc/logrotate.d/price-monitor`:

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
        systemctl reload price-monitor
    endscript
}
```

### 3. Configure Firewall (Production)

```bash
# Ubuntu/Debian
sudo ufw allow 8000/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

### 4. Set Up Monitoring (Optional)

Consider setting up external monitoring:
- Uptime monitoring (e.g., UptimeRobot)
- Log monitoring (e.g., Grafana)
- Resource monitoring (e.g., Prometheus)

## Verification

### 1. Check Service Status

```bash
# Direct run
python main.py

# Or check systemd service
sudo systemctl status price-monitor
```

### 2. Test Web Interface

1. Open browser to `http://localhost:8000`
2. Verify dashboard loads
3. Check Settings page
4. Test Health dashboard

### 3. Test API Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Detailed health check
curl http://localhost:8000/health/detailed
```

### 4. Check Logs

```bash
# View application logs
tail -f logs/app.log

# View structured logs
tail -f logs/app-structured.log

# View error logs
tail -f logs/errors.log
```

### 5. Verify Database

The SQLite database should be created automatically. Check:

```bash
# List database files
ls -la data/

# Connect to database (if sqlite3 installed)
sqlite3 data/price_monitor.db ".tables"
```

## Troubleshooting Installation

### Common Issues

#### Python Version Issues

```bash
# Check Python version
python --version
# or
python3 --version

# Use specific Python version
python3.9 -m venv .venv
```

#### Permission Denied

```bash
# Fix permissions (Linux/macOS)
sudo chown -R $USER:$USER .
chmod +x main.py
```

#### Port Already in Use

```bash
# Check what's using the port
netstat -tulpn | grep :8000

# Use different port
export PORT=8001
python main.py
```

#### Missing Dependencies

```bash
# Reinstall dependencies
pip install --force-reinstall -r requirements.txt

# Check for conflicts
pip check
```

### Getting Help

If you encounter issues:

1. Check the [Troubleshooting Guide](troubleshooting.md)
2. Review the logs in the `logs/` directory
3. Verify your configuration file
4. Check the Health Dashboard at `/health`

## Next Steps

After successful installation:

1. [Configure the application](configuration.md)
2. [Set up your first price alerts](user-manual.md)
3. [Review security settings](security.md)
4. [Set up monitoring and backups](maintenance.md)