# Development Workflow

## Local Development Setup

### Prerequisites
```bash
# Python 3.8 or higher
python --version

# pip for package management
pip --version
```

### Initial Setup
```bash
# Clone or create project directory
mkdir price-monitor
cd price-monitor

# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
copy .env.example .env

# Edit .env with your API keys
# ALPHA_VANTAGE_API_KEY=your_key_here
# TWILIO_ACCOUNT_SID=your_sid_here
# TWILIO_AUTH_TOKEN=your_token_here
# WHATSAPP_NUMBER=your_number_here
```

### Development Commands
```bash
# Start application
python main.py

# Start with auto-reload for development
uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Run tests
pytest tests/

# Run with verbose logging
python main.py --log-level DEBUG
```

## Environment Configuration

### Required Environment Variables
```bash
# API Keys
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token

# WhatsApp Configuration
WHATSAPP_NUMBER=+1234567890

# Application Settings
MONITORING_INTERVAL_MINUTES=5
COOLDOWN_HOURS=3
LOG_LEVEL=INFO
DATABASE_PATH=data/alerts.db
```
