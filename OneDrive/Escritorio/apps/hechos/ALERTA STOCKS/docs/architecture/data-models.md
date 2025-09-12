# Data Models

## Alert

**Purpose:** Core entity representing a price monitoring alert with trigger conditions and status tracking.

**Key Attributes:**
- id: Integer - Primary key, auto-increment
- asset_symbol: String - Stock ticker (AAPL) or crypto symbol (bitcoin)
- asset_type: Enum - 'stock' or 'crypto' only
- condition_type: Enum - '>=' or '<=' only  
- threshold_price: Decimal - Price level that triggers alert
- is_active: Boolean - Whether alert is currently monitoring
- created_at: DateTime - When alert was created
- last_triggered: DateTime - Last time alert sent notification (for cooldown)

### TypeScript Interface
```typescript
interface Alert {
  id: number;
  asset_symbol: string;
  asset_type: 'stock' | 'crypto';
  condition_type: '>=' | '<=';
  threshold_price: number;
  is_active: boolean;
  created_at: string; // ISO datetime
  last_triggered?: string; // ISO datetime, nullable
}
```

### Relationships
- No foreign key relationships (single entity model)
- One-to-many relationship with trigger history (implicit via last_triggered field)

## Configuration

**Purpose:** Application configuration settings loaded from environment variables.

**Key Attributes:**
- alpha_vantage_api_key: String - API key for stock price data
- twilio_account_sid: String - Twilio account identifier
- twilio_auth_token: String - Twilio authentication token
- whatsapp_number: String - User's WhatsApp number for notifications
- monitoring_interval: Integer - Minutes between price checks (1-60)
- cooldown_hours: Integer - Hours between duplicate alerts (default 3)

### TypeScript Interface
```typescript
interface Configuration {
  alpha_vantage_api_key: string;
  twilio_account_sid: string;
  twilio_auth_token: string;
  whatsapp_number: string;
  monitoring_interval: number; // 1-60 minutes
  cooldown_hours: number; // default 3
}
```
