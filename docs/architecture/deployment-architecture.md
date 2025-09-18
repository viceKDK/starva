# Deployment Architecture

## Deployment Strategy

**Frontend Deployment:**
- **Platform:** Apple App Store (iOS only for MVP)
- **Build Command:** `eas build --platform ios`
- **Build Service:** Expo Application Services (EAS)
- **Distribution:** App Store Connect

**Backend Deployment:**
- **Platform:** N/A - No backend services
- **Local Data:** SQLite database created automatically on device
- **No Server Infrastructure Required**

## CI/CD Pipeline

```yaml
name: iOS App CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm test

  build:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform ios --non-interactive
```

## Environments

| Environment | Frontend URL | Backend URL | Purpose |
|-------------|--------------|-------------|---------|
| Development | Local Simulator | N/A | Local development and testing |
| TestFlight | iOS TestFlight App | N/A | Beta testing with physical devices |
| Production | App Store | N/A | Public release version |
