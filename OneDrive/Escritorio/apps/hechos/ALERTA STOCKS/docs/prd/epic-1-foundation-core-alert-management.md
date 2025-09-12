# Epic 1: Foundation & Core Alert Management

**Epic Goal:** Establish a functional web application with database persistence that allows users to create, view, edit, and delete price alerts through a clean web interface. This epic delivers immediate value by providing a complete alert management system that can be manually used to track configurations, even before automation is implemented.

## Story 1.1: Project Setup and Basic Infrastructure

As a developer,
I want to set up the basic Python project structure with FastAPI and SQLite,
so that I have a solid foundation to build the alert management system.

### Acceptance Criteria
1. Python project structure created with main.py, requirements.txt, and .env template
2. FastAPI application runs successfully on localhost:8000
3. SQLite database connection established with basic health check endpoint
4. Basic HTML template structure created with Jinja2 integration
5. Static file serving configured for CSS/JS assets
6. Environment variable loading implemented for configuration

## Story 1.2: Alert Database Schema and Models

As a developer,
I want to create the database schema and data models for price alerts,
so that I can persist alert configurations reliably.

### Acceptance Criteria
1. SQLite table created for alerts with fields: id, asset_symbol, asset_type, condition_type, threshold_price, is_active, created_at, last_triggered
2. Python data models defined using SQLAlchemy or similar ORM
3. Database initialization script creates tables automatically on first run
4. Basic database operations (create, read, update, delete) implemented and tested
5. Data validation ensures asset_type is only 'stock' or 'crypto'
6. Condition_type validation ensures only '>=' or '<=' values

## Story 1.3: Alert Creation Web Interface

As a user,
I want to create new price alerts through a web form,
so that I can configure which assets to monitor.

### Acceptance Criteria
1. Web form displays with fields for asset symbol, asset type dropdown, condition dropdown, and threshold price
2. Form validation prevents empty submissions and validates numeric threshold values
3. Successful alert creation redirects to alert list with success message
4. Form errors display clearly with specific validation messages
5. Asset type dropdown contains only "Stock" and "Crypto" options
6. Condition dropdown contains only ">=" and "<=" options

## Story 1.4: Alert Management Dashboard

As a user,
I want to view all my configured alerts in a table format,
so that I can see what I'm monitoring at a glance.

### Acceptance Criteria
1. Main dashboard displays all alerts in a sortable table
2. Table shows: asset symbol, asset type, condition, threshold price, status (active/inactive), created date
3. Each alert row has toggle button to activate/deactivate
4. Each alert row has delete button with confirmation dialog
5. Empty state displays helpful message when no alerts exist
6. Alert status changes are immediately reflected in the interface

## Story 1.5: Alert Editing and Status Management

As a user,
I want to activate, deactivate, and delete alerts,
so that I can manage my monitoring configuration without recreating alerts.

### Acceptance Criteria
1. Toggle buttons successfully activate/deactivate alerts with visual feedback
2. Delete buttons remove alerts after user confirmation
3. Status changes persist across browser refreshes
4. Bulk operations work correctly when multiple alerts exist
5. UI provides clear visual distinction between active and inactive alerts
6. No accidental deletions possible without explicit confirmation
