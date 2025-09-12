# Coding Standards

## Critical Full-Stack Rules

- **Environment Configuration:** Always access config through settings module, never os.environ directly
- **Error Handling:** All API routes must use try-catch blocks and return proper HTTP status codes  
- **Database Operations:** Never use raw SQL - always use SQLAlchemy ORM for type safety
- **API Response Format:** Consistent JSON response structure for all API endpoints
- **Input Validation:** Use Pydantic models for all API request validation
- **Logging:** Use structured logging with appropriate levels (DEBUG, INFO, WARNING, ERROR)

## Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Templates | snake_case | - | `alert_form.html` |
| CSS Classes | kebab-case | - | `.alert-table` |
| API Routes | - | kebab-case | `/api/price-alerts` |
| Database Tables | - | snake_case | `price_alerts` |
| Python Functions | - | snake_case | `create_alert()` |
| Python Classes | - | PascalCase | `AlertService` |
