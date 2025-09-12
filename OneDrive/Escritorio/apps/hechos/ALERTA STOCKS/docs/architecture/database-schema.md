# Database Schema

```sql
-- Price alerts table
CREATE TABLE alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_symbol VARCHAR(20) NOT NULL,
    asset_type VARCHAR(10) NOT NULL CHECK (asset_type IN ('stock', 'crypto')),
    condition_type VARCHAR(2) NOT NULL CHECK (condition_type IN ('>=', '<=')),
    threshold_price DECIMAL(15, 8) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_triggered DATETIME NULL
);

-- Indexes for performance
CREATE INDEX idx_alerts_active ON alerts(is_active);
CREATE INDEX idx_alerts_asset_symbol ON alerts(asset_symbol);
CREATE INDEX idx_alerts_last_triggered ON alerts(last_triggered);

-- Configuration table (optional - can use env vars only)
CREATE TABLE configuration (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```
