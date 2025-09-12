# WhatsApp Price Monitoring Application Product Requirements Document (PRD)

**Date:** 2025-08-27  
**Version:** 1.0  
**Author:** PM John

## Goals and Background Context

### Goals
- Eliminate manual price monitoring and receive instant WhatsApp alerts when price conditions are met
- Achieve peace of mind by automating market surveillance during work hours
- Improve trading/investment timing through immediate notifications
- Maintain productivity focus by reducing market-checking interruptions
- Deploy a reliable personal tool that works locally without external dependencies

### Background Context

Based on the project brief, this application addresses the productivity and stress issues caused by constant manual price monitoring of financial assets. Current solutions require checking multiple apps/websites repeatedly, creating interruptions and potential missed opportunities. 

This personal-use application provides a simple local server solution that automatically monitors configured price thresholds and delivers immediate WhatsApp notifications, allowing you to focus on other work while staying informed about critical market movements.

### Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-08-27 | 1.0 | Initial PRD creation based on project brief | PM John |

## Requirements

### Functional Requirements

**FR1:** The system shall allow users to create price alerts by specifying: asset symbol, asset type (stock/crypto), condition type (≥ or ≤), and threshold price value.

**FR2:** The system shall provide a web interface to list all configured alerts showing asset, condition, threshold, and current status (active/inactive).

**FR3:** The system shall allow users to activate/deactivate individual alerts without deleting them.

**FR4:** The system shall allow users to permanently delete alerts they no longer need.

**FR5:** The system shall automatically check current prices for all active alerts at configurable intervals (1-5 minutes).

**FR6:** The system shall send WhatsApp messages when price conditions are met, including: asset name/symbol, current price, triggered condition, and timestamp.

**FR7:** The system shall implement configurable anti-spam protection with cooldown period (default: 3 hours) after each alert triggers to prevent duplicate messages.

**FR8:** The system shall track the last trigger time for each alert to manage cooldown periods.

**FR9:** The system shall support only stocks and cryptocurrency asset types.

**FR10:** The system shall persist all alert configurations in a local SQLite database.

**FR11:** The system shall load configuration from environment variables (.env file) including API keys, notification settings, and cooldown duration.

### Non-Functional Requirements

**NFR1:** The system shall use only free-tier APIs (Alpha Vantage for stocks, CoinGecko for crypto) to maintain zero operational cost.

**NFR2:** The system shall run as a local server accessible only from localhost to ensure security and privacy.

**NFR3:** The system shall have minimal resource consumption suitable for running continuously on a personal computer.

**NFR4:** The system shall deliver WhatsApp notifications within 1 minute of price condition triggers.

**NFR5:** The system shall maintain 99% uptime when the host computer is running and connected to internet.

**NFR6:** The system shall handle API rate limits gracefully without crashing or losing functionality.

**NFR7:** The system shall store sensitive data (API keys) securely and never log or expose them.

## User Interface Design Goals

### Overall UX Vision
Simple, functional web interface optimized for quick alert management. Focus on efficiency over aesthetics - clean forms, clear data tables, and immediate feedback. The interface should feel like a personal tool rather than a consumer app.

### Key Interaction Paradigms
- **Form-first approach:** Primary interactions through simple HTML forms for creating/editing alerts
- **Table-based management:** Alert management via sortable tables with inline actions
- **Immediate feedback:** Real-time status updates and clear success/error messages
- **Single-page workflow:** Minimal navigation - everything accessible from main dashboard

### Core Screens and Views
- **Main Dashboard:** Alert creation form + alert management table on single page
- **Configuration Screen:** Settings for API keys, cooldown duration, and monitoring intervals

### Accessibility: None
Given the personal-use nature and local deployment, formal accessibility compliance is not required.

### Branding
Minimal, functional design with clean typography. No specific branding requirements - focus on readability and usability over visual design.

### Target Device and Platforms: Web Responsive
Web-based interface that works well on desktop browsers, with basic mobile responsiveness for occasional mobile access.

## Technical Assumptions

### Repository Structure: Monorepo
Single repository containing all application components - backend, frontend templates, static assets, and configuration files in a simple Python project structure.

### Service Architecture
**Monolithic local application** built with Python FastAPI serving both API endpoints and HTML templates. Single-process application with integrated scheduler for price monitoring and SQLite for data persistence.

### Testing Requirements
**Unit testing with basic integration tests** focusing on core alert logic, price fetching, and notification sending. Manual testing for UI workflows given the simple interface.

### Additional Technical Assumptions and Requests

**Technology Stack:**
- **Backend:** Python 3.8+ with FastAPI framework
- **Frontend:** Jinja2 templates with minimal vanilla JavaScript
- **Database:** SQLite for local data persistence
- **Scheduler:** APScheduler for automated price checking
- **HTTP Client:** requests library for API calls
- **Messaging:** Twilio SDK for WhatsApp integration

**APIs and External Services:**
- Alpha Vantage API (free tier, 5 calls/minute) for stock prices
- CoinGecko API (free tier, unlimited basic requests) for cryptocurrency prices
- Twilio WhatsApp Sandbox for development, WhatsApp Cloud API for production

**Deployment and Environment:**
- Local development and production on Windows PC
- uvicorn ASGI server for local hosting
- Environment-based configuration via .env files
- No containerization needed for personal use

**Security Considerations:**
- API keys stored in .env files (not committed to version control)
- Local-only access (127.0.0.1 binding)
- No authentication required (single-user, local access)

## Epic List

### Epic 1: Foundation & Core Alert Management
Establish project infrastructure, database setup, and basic alert CRUD operations with a simple web interface.

### Epic 2: Price Monitoring & WhatsApp Integration  
Implement automated price checking, notification system, and anti-spam functionality to complete the core value proposition.

### Epic 3: Configuration & Production Readiness
Add configuration management, error handling, and deployment preparation for reliable personal use.

## Epic 1: Foundation & Core Alert Management

**Epic Goal:** Establish a functional web application with database persistence that allows users to create, view, edit, and delete price alerts through a clean web interface. This epic delivers immediate value by providing a complete alert management system that can be manually used to track configurations, even before automation is implemented.

### Story 1.1: Project Setup and Basic Infrastructure

As a developer,
I want to set up the basic Python project structure with FastAPI and SQLite,
so that I have a solid foundation to build the alert management system.

#### Acceptance Criteria
1. Python project structure created with main.py, requirements.txt, and .env template
2. FastAPI application runs successfully on localhost:8000
3. SQLite database connection established with basic health check endpoint
4. Basic HTML template structure created with Jinja2 integration
5. Static file serving configured for CSS/JS assets
6. Environment variable loading implemented for configuration

### Story 1.2: Alert Database Schema and Models

As a developer,
I want to create the database schema and data models for price alerts,
so that I can persist alert configurations reliably.

#### Acceptance Criteria
1. SQLite table created for alerts with fields: id, asset_symbol, asset_type, condition_type, threshold_price, is_active, created_at, last_triggered
2. Python data models defined using SQLAlchemy or similar ORM
3. Database initialization script creates tables automatically on first run
4. Basic database operations (create, read, update, delete) implemented and tested
5. Data validation ensures asset_type is only 'stock' or 'crypto'
6. Condition_type validation ensures only '>=' or '<=' values

### Story 1.3: Alert Creation Web Interface

As a user,
I want to create new price alerts through a web form,
so that I can configure which assets to monitor.

#### Acceptance Criteria
1. Web form displays with fields for asset symbol, asset type dropdown, condition dropdown, and threshold price
2. Form validation prevents empty submissions and validates numeric threshold values
3. Successful alert creation redirects to alert list with success message
4. Form errors display clearly with specific validation messages
5. Asset type dropdown contains only "Stock" and "Crypto" options
6. Condition dropdown contains only ">=" and "<=" options

### Story 1.4: Alert Management Dashboard

As a user,
I want to view all my configured alerts in a table format,
so that I can see what I'm monitoring at a glance.

#### Acceptance Criteria
1. Main dashboard displays all alerts in a sortable table
2. Table shows: asset symbol, asset type, condition, threshold price, status (active/inactive), created date
3. Each alert row has toggle button to activate/deactivate
4. Each alert row has delete button with confirmation dialog
5. Empty state displays helpful message when no alerts exist
6. Alert status changes are immediately reflected in the interface

### Story 1.5: Alert Editing and Status Management

As a user,
I want to activate, deactivate, and delete alerts,
so that I can manage my monitoring configuration without recreating alerts.

#### Acceptance Criteria
1. Toggle buttons successfully activate/deactivate alerts with visual feedback
2. Delete buttons remove alerts after user confirmation
3. Status changes persist across browser refreshes
4. Bulk operations work correctly when multiple alerts exist
5. UI provides clear visual distinction between active and inactive alerts
6. No accidental deletions possible without explicit confirmation

## Epic 2: Price Monitoring & WhatsApp Integration

**Epic Goal:** Transform the alert management system into an active monitoring tool by implementing automated price checking from financial APIs, WhatsApp notification delivery, and intelligent anti-spam protection. This epic delivers the core automation value that makes the application truly useful for hands-off price monitoring.

### Story 2.1: External API Integration for Price Fetching

As a developer,
I want to integrate with Alpha Vantage and CoinGecko APIs,
so that the system can fetch real-time prices for stocks and cryptocurrencies.

#### Acceptance Criteria
1. Alpha Vantage API client implemented for stock price fetching with API key from environment
2. CoinGecko API client implemented for cryptocurrency price fetching
3. Price fetching functions handle API rate limits gracefully with exponential backoff
4. API errors are logged and handled without crashing the application
5. Price data is cached for 30 seconds to minimize API calls during testing
6. Both APIs return standardized price objects with symbol, current_price, and timestamp

### Story 2.2: Twilio WhatsApp Integration

As a developer,
I want to integrate Twilio WhatsApp messaging,
so that the system can send notifications to the user's phone.

#### Acceptance Criteria
1. Twilio WhatsApp client configured with credentials from environment variables
2. Message sending function formats notifications with asset name, current price, condition triggered, and timestamp
3. WhatsApp message delivery is confirmed and logged for debugging
4. Failed message attempts are retried once before logging as failure
5. Message format is clear and readable on mobile devices
6. Sandbox mode works for development testing with pre-approved number

### Story 2.3: Automated Price Monitoring Scheduler

As a user,
I want the system to automatically check prices at regular intervals,
so that I don't have to manually monitor the markets.

#### Acceptance Criteria
1. Background scheduler runs price checks every configurable interval (default 5 minutes)
2. Only active alerts are processed during each monitoring cycle
3. Price checking continues running even when web interface is not accessed
4. Scheduler handles exceptions gracefully and continues running after errors
5. Monitoring interval is configurable via environment variable (1-60 minutes)
6. Scheduler status is visible in the web interface (last check time, next check time)

### Story 2.4: Alert Triggering Logic

As a user,
I want the system to detect when price conditions are met,
so that I receive notifications exactly when my criteria are satisfied.

#### Acceptance Criteria
1. Alert evaluation correctly identifies when current price meets >= or <= conditions
2. Triggered alerts send WhatsApp notifications with complete information
3. Alert trigger events are logged with timestamp for debugging and history
4. Multiple alerts for the same asset can trigger independently
5. Price comparison handles floating point precision correctly
6. Trigger detection works for both stock and crypto price formats

### Story 2.5: Anti-Spam Cooldown System

As a user,
I want to avoid receiving duplicate notifications for the same alert,
so that I'm not spammed when prices fluctuate around my threshold.

#### Acceptance Criteria
1. Cooldown period (default 3 hours) prevents duplicate notifications for same alert
2. Cooldown timer is configurable via environment variable
3. Each alert tracks its last trigger timestamp independently
4. Alerts can re-trigger after cooldown period expires
5. Cooldown status is visible in the web interface (time until next possible trigger)
6. Manual alert reactivation respects cooldown periods

## Epic 3: Configuration & Production Readiness

**Epic Goal:** Add robust configuration management, comprehensive error handling, logging capabilities, and deployment preparation to ensure the application runs reliably for daily personal use with minimal maintenance overhead.

### Story 3.1: Configuration Management System

As a user,
I want to configure application settings through environment variables and a web interface,
so that I can customize behavior without modifying code.

#### Acceptance Criteria
1. .env file template provided with all configurable options documented
2. Web interface for viewing and updating key settings (intervals, cooldowns, API endpoints)
3. Configuration validation ensures valid ranges and formats
4. Settings changes take effect without requiring application restart where possible
5. Default values work out-of-the-box for immediate functionality
6. Configuration backup and restore functionality for settings preservation

### Story 3.2: Comprehensive Error Handling and Logging

As a user,
I want the application to handle errors gracefully and provide useful diagnostic information,
so that I can troubleshoot issues and maintain reliable operation.

#### Acceptance Criteria
1. Structured logging implemented with configurable log levels
2. API failures are logged with specific error details and retry information
3. Database errors are handled gracefully without data corruption
4. WhatsApp delivery failures are logged and displayed in web interface
5. Application startup validates all required configuration and external dependencies
6. Log rotation prevents log files from consuming excessive disk space

### Story 3.3: Health Monitoring and Status Dashboard

As a user,
I want to see the current health and status of all system components,
so that I can verify everything is working correctly.

#### Acceptance Criteria
1. System status page shows connectivity to all external APIs
2. Last successful price fetch times displayed for each monitored asset
3. WhatsApp connectivity status and last message delivery confirmation
4. Database health check and basic performance metrics
5. Scheduler status with next execution times and recent activity log
6. Alert statistics showing trigger counts and cooldown status

### Story 3.4: Data Management and Backup

As a user,
I want to backup and restore my alert configurations,
so that I can recover from system issues or migrate to a new setup.

#### Acceptance Criteria
1. Export functionality creates JSON backup of all alert configurations
2. Import functionality restores alerts from backup files with validation
3. Database backup occurs automatically with configurable frequency
4. Manual backup/restore functions accessible through web interface
5. Backup files include timestamp and version information
6. Import process prevents duplicate alerts and validates data integrity

### Story 3.5: Production Deployment and Documentation

As a user,
I want clear instructions and tools for deploying the application,
so that I can set up and maintain the system reliably.

#### Acceptance Criteria
1. README.md provides complete setup instructions from scratch
2. Requirements.txt includes all dependencies with version constraints
3. Startup scripts for Windows to run application as a service
4. Environment variable documentation with examples and security notes
5. Troubleshooting guide covers common issues and solutions
6. Migration path from Twilio Sandbox to WhatsApp Cloud API documented

## Next Steps

### UX Expert Prompt
Please review this PRD and create a simple, functional UI design for the WhatsApp price monitoring application. Focus on a clean single-page dashboard with alert creation form and management table. Prioritize usability over visual design for this personal-use tool.

### Architect Prompt
Please review this PRD and create the technical architecture for the WhatsApp price monitoring application. Design a simple monolithic Python FastAPI application with SQLite persistence, focusing on reliability and maintainability for personal use. Include specific technology choices, project structure, and deployment considerations.