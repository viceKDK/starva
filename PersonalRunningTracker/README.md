# Personal Running Tracker MVP

## 🏃‍♂️ Overview

A privacy-first, local-only running tracker for iOS built with React Native and Expo. This app captures GPS routes, tracks running metrics, and stores personal running history entirely on your device without any cloud dependencies or social features.

## 📱 Features

- **GPS Run Tracking**: Real-time location tracking with start/pause/stop functionality
- **Route Visualization**: Display completed routes on interactive maps
- **Personal Records**: Automatic detection and tracking of personal bests
- **Run History**: Complete history of all runs with detailed metrics
- **Privacy-First**: All data stays local - no cloud storage or accounts required
- **Offline Ready**: Works completely offline after initial setup

## 🛠️ Tech Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | React Native via Expo | 54+ | Mobile app development |
| **Language** | TypeScript | 5.0+ | Type safety and better DX |
| **Database** | SQLite via expo-sqlite | 16.0+ | Local data persistence |
| **GPS** | expo-location | 19.0+ | GPS tracking and location |
| **Maps** | react-native-maps | 1.20+ | Route visualization |
| **Navigation** | React Navigation | 7.0+ | Screen navigation |
| **Testing** | Jest + React Native Testing Library | Latest | Unit and integration testing |

## 🚀 Quick Start

### Prerequisites

```bash
# Node.js 18+
node --version

# Expo CLI
npm install -g @expo/cli

# iOS Simulator (macOS only)
# Download Xcode from App Store
```

### Setup

```bash
# Navigate to project directory
cd PersonalRunningTracker

# Install dependencies
npm install

# Start development server
expo start

# Run on iOS simulator
expo run:ios
```

## 📁 Project Structure

This project follows **Clean Architecture** principles with strict adherence to **SOLID**, **GRASP**, and **Clean Code** practices.

```
src/
├── domain/          # Business entities and interfaces
│   ├── entities/    # Core business entities (Run, GPSPoint)
│   └── repositories/# Repository interfaces (IRunRepository, IGPSService)
├── application/     # Use cases and DTOs
│   └── usecases/    # Application use cases
├── infrastructure/  # External services (GPS, SQLite)
│   ├── gps/         # GPS service implementations
│   └── persistence/ # Database implementations
├── presentation/    # UI components and screens
│   ├── screens/     # Screen components
│   ├── components/  # Reusable UI components
│   └── navigation/  # Navigation setup
└── shared/          # Common utilities and types
    ├── types/       # TypeScript type definitions
    └── utils/       # Utility functions
```

## 🧪 Development Commands

```bash
# Start development server
npm start

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Format code
npm run format

# Run tests (when implemented)
npm test
```

## 🎯 Clean Architecture Implementation

### Domain Layer (Core Business Logic)
```typescript
// Pure business entities and rules
export interface Run {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  distance: number;
  averagePace: number;
  route: GPSPoint[];
  name: string;
  notes?: string;
  createdAt: Date;
}
```

### Application Layer (Use Cases)
```typescript
// Orchestrates business operations
export class StartRunTrackingUseCase {
  constructor(private gpsService: IGPSService) {}

  async execute(): Promise<boolean> {
    return await this.gpsService.startTracking();
  }
}
```

### Infrastructure Layer (External Concerns)
```typescript
// Implements domain interfaces
export class ExpoGPSService implements IGPSService {
  async startTracking(): Promise<boolean> {
    // Expo Location API implementation
  }
}
```

### Presentation Layer (UI)
```typescript
// React components with clean separation
export const TrackingScreen: React.FC<Props> = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Run Tracking</Text>
    </View>
  );
};
```

## 📏 Code Quality Standards

### Naming Standards
- **Variables/Functions**: `camelCase` with intention-revealing names
- **Classes/Interfaces**: `PascalCase` with clear responsibility
- **Components**: `PascalCase` describing purpose
- **Constants**: `SCREAMING_SNAKE_CASE` with context
- **Files**: Match content type (PascalCase for components, camelCase for utilities)

### Architecture Enforcement
- ✅ Favor composition over inheritance
- ✅ Use dependency injection for all services
- ✅ Separate UI from business logic completely
- ✅ Apply design patterns to solve common problems
- ❌ No business logic in UI components
- ❌ No hard-coded dependencies
- ❌ No magic numbers or unclear variable names

## 🔒 Privacy & Security

- **Local-First**: All data remains on device
- **No Cloud Dependencies**: Zero external data transmission
- **iOS Security**: Leverages iOS app sandbox and device security
- **No User Accounts**: Single-user, privacy-focused design
- **No Analytics**: No tracking or data collection

## 📄 License

MIT License - See [LICENSE](./LICENSE) file for details.

---

*Built with ❤️ using Clean Architecture, SOLID principles, and privacy-first design.*

## 🗺️ Map Provider Switch (1 línea)

La app usa Apple Maps (iOS) por defecto. Para cambiar el proveedor a futuro (por ejemplo Mapbox), solo edita una línea:

- Archivo: `src/presentation/components/maps/index.ts`
- Línea a cambiar:

```ts
// Actual (Apple Maps)
export { AppleRouteMap as CurrentRouteMap } from './AppleRouteMap';

// Futuro (Mapbox)
// export { MapboxRouteMap as CurrentRouteMap } from './MapboxRouteMap';
```

La pantalla de detalle importa `CurrentRouteMap`, así que el cambio de proveedor no requiere tocar las pantallas.
