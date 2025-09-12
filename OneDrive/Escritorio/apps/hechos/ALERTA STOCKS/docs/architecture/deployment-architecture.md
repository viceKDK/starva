# Deployment Architecture

## Deployment Strategy

**Frontend Deployment:**
- **Platform:** Local Windows PC (no separate frontend deployment)
- **Build Command:** Not applicable (server-side rendering)
- **Output Directory:** Templates served directly by FastAPI
- **CDN/Edge:** Not applicable (local access only)

**Backend Deployment:**
- **Platform:** Local Windows PC
- **Build Command:** pip install -r requirements.txt
- **Deployment Method:** Direct Python execution or Windows service

## Environments

| Environment | Frontend URL | Backend URL | Purpose |
|-------------|-------------|-------------|---------|
| Development | http://127.0.0.1:8000 | http://127.0.0.1:8000/api | Local development |
| Production | http://127.0.0.1:8000 | http://127.0.0.1:8000/api | Personal use (same as dev) |
