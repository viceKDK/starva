# Development Workflow

## Local Development Setup

### Prerequisites

```bash
# Install Node.js 18+
node --version

# Install Expo CLI
npm install -g @expo/cli

# Install iOS Simulator (macOS only)
# Download Xcode from App Store

# Install development dependencies
npm install -g eas-cli
```

### Initial Setup

```bash
# Clone and setup project
git clone <repository-url>
cd personal-running-tracker

# Install dependencies
npm install

# Initialize Expo development build
expo install

# Setup iOS simulator
expo run:ios
```

### Development Commands

```bash
# Start development server
expo start

# Run on iOS simulator
expo run:ios

# Run on physical iOS device
expo run:ios --device

# Run tests
npm test

# Run type checking
npm run type-check

# Lint code
npm run lint
```

## Environment Configuration

### Required Environment Variables

```bash
# No environment variables required for local-first app
# All configuration handled through app.json and TypeScript constants

# Optional development settings in app.json:
{
  "expo": {
    "name": "Personal Running Tracker",
    "slug": "personal-running-tracker",
    "privacy": "unlisted",
    "platforms": ["ios"],
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location to track your runs."
        }
      ]
    ]
  }
}
```
