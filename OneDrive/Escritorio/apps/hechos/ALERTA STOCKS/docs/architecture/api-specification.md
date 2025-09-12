# API Specification

## REST API Specification

```yaml
openapi: 3.0.0
info:
  title: Price Monitoring API
  version: 1.0.0
  description: Local API for managing price alerts and system status
servers:
  - url: http://127.0.0.1:8000
    description: Local development and production server

paths:
  /:
    get:
      summary: Main dashboard page
      responses:
        '200':
          description: HTML dashboard with alert form and table
          content:
            text/html:
              schema:
                type: string

  /api/alerts:
    get:
      summary: List all alerts
      responses:
        '200':
          description: Array of all alerts
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Alert'
    post:
      summary: Create new alert
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateAlert'
      responses:
        '201':
          description: Alert created successfully
        '400':
          description: Validation error

  /api/alerts/{alert_id}/toggle:
    patch:
      summary: Toggle alert active status
      parameters:
        - name: alert_id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Alert status updated
        '404':
          description: Alert not found

  /api/alerts/{alert_id}:
    delete:
      summary: Delete alert
      parameters:
        - name: alert_id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '204':
          description: Alert deleted
        '404':
          description: Alert not found

  /api/status:
    get:
      summary: System health status
      responses:
        '200':
          description: System status information
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SystemStatus'

components:
  schemas:
    Alert:
      type: object
      properties:
        id:
          type: integer
        asset_symbol:
          type: string
        asset_type:
          type: string
          enum: ['stock', 'crypto']
        condition_type:
          type: string
          enum: ['>=', '<=']
        threshold_price:
          type: number
        is_active:
          type: boolean
        created_at:
          type: string
          format: date-time
        last_triggered:
          type: string
          format: date-time
          nullable: true

    CreateAlert:
      type: object
      required:
        - asset_symbol
        - asset_type
        - condition_type
        - threshold_price
      properties:
        asset_symbol:
          type: string
        asset_type:
          type: string
          enum: ['stock', 'crypto']
        condition_type:
          type: string
          enum: ['>=', '<=']
        threshold_price:
          type: number

    SystemStatus:
      type: object
      properties:
        database_status:
          type: string
        api_status:
          type: object
        scheduler_status:
          type: object
        last_check_time:
          type: string
          format: date-time
```
