# Epic 2: Price Monitoring & WhatsApp Integration

**Epic Goal:** Transform the alert management system into an active monitoring tool by implementing automated price checking from financial APIs, WhatsApp notification delivery, and intelligent anti-spam protection. This epic delivers the core automation value that makes the application truly useful for hands-off price monitoring.

## Story 2.1: External API Integration for Price Fetching

As a developer,
I want to integrate with Alpha Vantage and CoinGecko APIs,
so that the system can fetch real-time prices for stocks and cryptocurrencies.

### Acceptance Criteria
1. Alpha Vantage API client implemented for stock price fetching with API key from environment
2. CoinGecko API client implemented for cryptocurrency price fetching
3. Price fetching functions handle API rate limits gracefully with exponential backoff
4. API errors are logged and handled without crashing the application
5. Price data is cached for 30 seconds to minimize API calls during testing
6. Both APIs return standardized price objects with symbol, current_price, and timestamp

## Story 2.2: Twilio WhatsApp Integration

As a developer,
I want to integrate Twilio WhatsApp messaging,
so that the system can send notifications to the user's phone.

### Acceptance Criteria
1. Twilio WhatsApp client configured with credentials from environment variables
2. Message sending function formats notifications with asset name, current price, condition triggered, and timestamp
3. WhatsApp message delivery is confirmed and logged for debugging
4. Failed message attempts are retried once before logging as failure
5. Message format is clear and readable on mobile devices
6. Sandbox mode works for development testing with pre-approved number

## Story 2.3: Automated Price Monitoring Scheduler

As a user,
I want the system to automatically check prices at regular intervals,
so that I don't have to manually monitor the markets.

### Acceptance Criteria
1. Background scheduler runs price checks every configurable interval (default 5 minutes)
2. Only active alerts are processed during each monitoring cycle
3. Price checking continues running even when web interface is not accessed
4. Scheduler handles exceptions gracefully and continues running after errors
5. Monitoring interval is configurable via environment variable (1-60 minutes)
6. Scheduler status is visible in the web interface (last check time, next check time)

## Story 2.4: Alert Triggering Logic

As a user,
I want the system to detect when price conditions are met,
so that I receive notifications exactly when my criteria are satisfied.

### Acceptance Criteria
1. Alert evaluation correctly identifies when current price meets >= or <= conditions
2. Triggered alerts send WhatsApp notifications with complete information
3. Alert trigger events are logged with timestamp for debugging and history
4. Multiple alerts for the same asset can trigger independently
5. Price comparison handles floating point precision correctly
6. Trigger detection works for both stock and crypto price formats

## Story 2.5: Anti-Spam Cooldown System

As a user,
I want to avoid receiving duplicate notifications for the same alert,
so that I'm not spammed when prices fluctuate around my threshold.

### Acceptance Criteria
1. Cooldown period (default 3 hours) prevents duplicate notifications for same alert
2. Cooldown timer is configurable via environment variable
3. Each alert tracks its last trigger timestamp independently
4. Alerts can re-trigger after cooldown period expires
5. Cooldown status is visible in the web interface (time until next possible trigger)
6. Manual alert reactivation respects cooldown periods
