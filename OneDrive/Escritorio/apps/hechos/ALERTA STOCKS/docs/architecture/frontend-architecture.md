# Frontend Architecture

## Component Architecture

### Component Organization
```
templates/
├── base.html              # Base template with common HTML structure
├── dashboard.html         # Main dashboard with alert form and table
├── status.html           # System status page
└── partials/
    ├── alert_form.html    # Alert creation form component
    ├── alert_table.html   # Alert management table component
    └── status_cards.html  # System status cards component

static/
├── css/
│   └── styles.css        # Minimal CSS for clean interface
└── js/
    └── dashboard.js      # Basic JavaScript for form interactions
```

### Component Template
```html
<!-- Base template structure -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}Price Monitor{% endblock %}</title>
    <link rel="stylesheet" href="{{ url_for('static', path='/css/styles.css') }}">
</head>
<body>
    <header>
        <h1>Price Monitor</h1>
        <nav>
            <a href="/">Dashboard</a>
            <a href="/status">Status</a>
        </nav>
    </header>
    <main>
        {% block content %}{% endblock %}
    </main>
    <script src="{{ url_for('static', path='/js/dashboard.js') }}"></script>
</body>
</html>
```

## State Management Architecture

### State Structure
```typescript
// No complex client-side state - server-side state management
interface PageState {
  alerts: Alert[];
  systemStatus: SystemStatus;
  formData: Partial<CreateAlert>;
  notifications: {
    success?: string;
    error?: string;
  };
}
```

### State Management Patterns
- Server-side state with page reloads for data updates
- Form state managed through HTML form elements
- Flash messages for user feedback after form submissions
- No client-side state persistence needed

## Routing Architecture

### Route Organization
```
Routes:
/                    # Main dashboard (GET)
/alerts              # Alert management (POST for creation)
/alerts/{id}/toggle  # Toggle alert status (POST)
/alerts/{id}/delete  # Delete alert (POST)
/status             # System status page (GET)
/api/alerts         # JSON API endpoints (GET, POST)
/api/status         # JSON system status (GET)
```

### Protected Route Pattern
```python
# No authentication needed - localhost binding provides security
# All routes accessible without protection for single-user personal use
@app.get("/")
async def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})
```

## Frontend Services Layer

### API Client Setup
```typescript
// Simple fetch-based API client for AJAX requests
class ApiClient {
  private baseURL = 'http://127.0.0.1:8000/api';
  
  async createAlert(alert: CreateAlert): Promise<Alert> {
    const response = await fetch(`${this.baseURL}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert)
    });
    return response.json();
  }
  
  async toggleAlert(id: number): Promise<void> {
    await fetch(`${this.baseURL}/alerts/${id}/toggle`, {
      method: 'PATCH'
    });
  }
}
```

### Service Example
```typescript
// Alert management service
class AlertService {
  constructor(private apiClient: ApiClient) {}
  
  async createAlert(formData: FormData): Promise<void> {
    const alert: CreateAlert = {
      asset_symbol: formData.get('asset_symbol') as string,
      asset_type: formData.get('asset_type') as 'stock' | 'crypto',
      condition_type: formData.get('condition_type') as '>=' | '<=',
      threshold_price: parseFloat(formData.get('threshold_price') as string)
    };
    
    await this.apiClient.createAlert(alert);
    location.reload(); // Simple page reload for state update
  }
}
```
