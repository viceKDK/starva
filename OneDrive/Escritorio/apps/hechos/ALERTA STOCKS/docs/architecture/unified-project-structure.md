# Unified Project Structure

```
price-monitor/
├── README.md                   # Setup and usage instructions
├── requirements.txt           # Python dependencies
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore file
├── main.py                   # Application entry point
├── src/
│   ├── __init__.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── web.py           # HTML routes
│   │   └── api.py           # JSON API routes
│   ├── services/
│   │   ├── __init__.py
│   │   ├── alert_service.py # Alert business logic
│   │   ├── price_service.py # Price monitoring
│   │   └── whatsapp_service.py # Notifications
│   ├── models/
│   │   ├── __init__.py
│   │   └── alert.py        # SQLAlchemy models
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py     # Configuration
│   └── utils/
│       ├── __init__.py
│       ├── database.py     # DB connection
│       └── scheduler.py    # Background jobs
├── templates/
│   ├── base.html           # Base template
│   ├── dashboard.html      # Main interface
│   └── status.html         # System status
├── static/
│   ├── css/
│   │   └── styles.css      # Basic styling
│   └── js/
│       └── dashboard.js    # Simple interactions
├── tests/
│   ├── __init__.py
│   ├── test_alerts.py      # Alert logic tests
│   ├── test_price_service.py # Price monitoring tests
│   └── test_api.py         # API endpoint tests
├── data/
│   └── alerts.db           # SQLite database (created at runtime)
├── logs/
│   └── app.log             # Application logs (created at runtime)
└── scripts/
    ├── start_windows.bat   # Windows startup script
    └── setup.py           # Initial setup script
```
