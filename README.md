﻿# Personal Running Tracker MVP

## Project Status & Roadmap

- Current status and recent changes: docs/project-status.md
- Roadmap and next steps: docs/roadmap.md

## ðŸƒâ€â™‚ï¸ Overview

A privacy-first, local-only running tracker for iOS built with React Native and Expo. This app captures GPS routes, tracks running metrics, and stores personal running history entirely on your device without any cloud dependencies or social features.

## ðŸ“± Features

- **GPS Run Tracking**: Real-time location tracking with start/pause/stop functionality
- **Route Visualization**: Display completed routes on interactive maps
- **Personal Records**: Automatic detection and tracking of personal bests
- **Run History**: Complete history of all runs with detailed metrics
- **Privacy-First**: All data stays local - no cloud storage or accounts required
- **Offline Ready**: Works completely offline after initial setup

## ðŸ—ï¸ Architecture

This project follows **Clean Architecture** principles with strict adherence to **SOLID**, **GRASP**, and **Clean Code** practices.

### Quick Architecture Overview

```
ðŸ“ Presentation Layer    â†’ React Components, Screens, Navigation
ðŸ“ Application Layer     â†’ Use Cases, Controllers, DTOs
ðŸ“ Domain Layer         â†’ Entities, Business Logic, Interfaces
ðŸ“ Infrastructure Layer â†’ Database, GPS, External Services
```

## ðŸ“š Documentation

### Architecture Documentation

| Document | Description | Status |
|----------|-------------|---------|
| [**Clean Architecture Guide**](./docs/clean-architecture/index.md) | Complete guide to our clean architecture implementation | âœ… Complete |
| [**Architecture Overview**](./docs/architecture/index.md) | High-level system architecture and technical decisions | âœ… Complete |

### Clean Code Principles

| Document | Description | Key Focus |
|----------|-------------|-----------|
| [**SOLID Principles**](./docs/clean-architecture/principles/solid-principles.md) | Applied SOLID principles with React Native examples | Single Responsibility, Open/Closed, LSP, ISP, DIP |
| [**GRASP Principles**](./docs/clean-architecture/principles/grasp-principles.md) | Responsibility assignment patterns | Creator, Expert, Controller, Cohesion, Coupling |
| [**Result Pattern**](./docs/clean-architecture/patterns/result-pattern.md) | Type-safe error handling without exceptions | Explicit error handling, composability |
| [**Clean Architecture Layers**](./docs/clean-architecture/layers/clean-architecture-layers.md) | Layer separation and dependency rules | Domain â†’ Application â†’ Infrastructure/Presentation |

### Development Guidelines

| Document | Description | Enforcement |
|----------|-------------|-------------|
| [**File Structure**](./docs/clean-architecture/guidelines/file-structure.md) | Modular organization with size limits | Max 500 lines per file, split at 450 |
| [**Naming Conventions**](./docs/clean-architecture/guidelines/naming-conventions.md) | Intention-revealing, descriptive naming | No generic names, clear purpose |

## ðŸš€ Quick Start

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
# Clone repository
git clone <repository-url>
cd personal-running-tracker

# Install dependencies
npm install

# Start development server
expo start

# Run on iOS simulator
expo run:ios
```

## ðŸ› ï¸ Tech Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | React Native via Expo | 49+ | Mobile app development |
| **Language** | TypeScript | 5.0+ | Type safety and better DX |
| **Database** | SQLite via expo-sqlite | 11.0+ | Local data persistence |
| **GPS** | expo-location | 16.0+ | GPS tracking and location |
| **Maps** | react-native-maps | 1.7+ | Route visualization |
| **Navigation** | React Navigation | 6.0+ | Screen navigation |
| **Testing** | Jest + React Native Testing Library | Latest | Unit and integration testing |
| **E2E Testing** | Detox | 20.0+ | End-to-end testing |

## ðŸ“ Code Quality Standards

### File Organization Rules
- **Maximum file size**: 500 lines (split at 450 lines)
- **Maximum class size**: 200 lines (split into helper classes)
- **Maximum function size**: 30-50 lines
- **Maximum parameters**: 4 parameters (use objects for more)

### Naming Standards
- **Variables/Functions**: `camelCase` with intention-revealing names
- **Classes/Interfaces**: `PascalCase` with clear responsibility
- **Components**: `PascalCase` describing purpose
- **Constants**: `SCREAMING_SNAKE_CASE` with context
- **Files**: Match content type (PascalCase for components, camelCase for utilities)

### Architecture Enforcement
- âœ… Favor composition over inheritance
- âœ… Use dependency injection for all services
- âœ… Separate UI from business logic completely
- âœ… Implement Result Pattern for error handling
- âœ… Apply design patterns to solve common problems
- âŒ No business logic in UI components
- âŒ No hard-coded dependencies
- âŒ No magic numbers or unclear variable names

## ðŸ›ï¸ Clean Architecture Implementation

### Domain Layer (Core Business Logic)
```typescript
// Pure business entities and rules
export class Run {
  calculateTotalDistance(): Distance { /* Pure domain logic */ }
  calculateAveragePace(): Pace { /* Business rules */ }
}

export interface IRunRepository {
  save(run: Run): Promise<Result<void, RepositoryError>>;
}
```

### Application Layer (Use Cases)
```typescript
// Orchestrates business operations
export class StartRunTrackingUseCase {
  constructor(
    private gpsService: IGPSService,
    private runRepository: IRunRepository
  ) {}

  async execute(): Promise<Result<RunSession, string>> {
    // Coordinates domain objects and infrastructure
  }
}
```

### Infrastructure Layer (External Concerns)
```typescript
// Implements domain interfaces
export class ExpoGPSService implements IGPSService {
  async getCurrentLocation(): Promise<Result<GPSPoint, GPSError>> {
    // Expo Location API implementation
  }
}

export class SQLiteRunRepository implements IRunRepository {
  async save(run: Run): Promise<Result<void, RepositoryError>> {
    // SQLite database implementation
  }
}
```

### Presentation Layer (UI)
```typescript
// React components with controllers
export const RunTrackingScreen: React.FC = () => {
  const controller = useRunTrackingController(); // Business logic
  return <RunTrackingView {...controller} />;   // Pure UI
};
```

## ðŸ§ª Testing Strategy

### Testing Pyramid
```
    E2E Tests (Detox)
   /              \
 Integration Tests
/                  \
Unit Tests      Component Tests
```

### Test Organization
```
__tests__/
â”œâ”€â”€ unit/           # Pure logic tests
â”œâ”€â”€ integration/    # Service integration tests
â”œâ”€â”€ components/     # React component tests
â””â”€â”€ e2e/           # End-to-end user flows
```

## ðŸš€ Development Workflow

### Running Tests
```bash
# Unit tests
npm test

# Component tests
npm run test:components

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

### Code Quality
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format
```

### Building
```bash
# Development build
expo build:ios

# Production build
eas build --platform ios
```

## ðŸ“Š Project Metrics

### Code Organization
- **Total Files**: ~150 files (average 200 lines each)
- **Max File Size**: 500 lines (enforced)
- **Max Function Size**: 50 lines (target 30-40)
- **Max Class Size**: 200 lines (split into helpers)

### Architecture Metrics
- **Layer Separation**: 100% (no cross-layer violations)
- **Dependency Direction**: Always inward (Domain â† Application â† Infrastructure/Presentation)
- **Interface Coverage**: 100% for cross-layer communication
- **Result Pattern Usage**: 100% for error handling

## ðŸŽ¯ Development Principles

### SOLID Principles Applied
- **S**: Single Responsibility - Each class has one reason to change
- **O**: Open/Closed - Extend without modifying existing code
- **L**: Liskov Substitution - Subtypes are replaceable
- **I**: Interface Segregation - Small, focused interfaces
- **D**: Dependency Inversion - Depend on abstractions

### GRASP Patterns Applied
- **Creator**: Assign creation to information holders
- **Information Expert**: Assign responsibility to data owners
- **Controller**: Handle system events in controllers
- **High Cohesion**: Keep related functionality together
- **Low Coupling**: Minimize dependencies between classes

### Clean Code Rules
1. **Meaningful Names**: Intention-revealing, searchable, pronounceable
2. **Small Functions**: 30-50 lines, single responsibility
3. **No Comments**: Code should be self-explanatory
4. **Error Handling**: Use Result Pattern, not exceptions

## ðŸ”’ Privacy & Security

- **Local-First**: All data remains on device
- **No Cloud Dependencies**: Zero external data transmission
- **iOS Security**: Leverages iOS app sandbox and device security
- **No User Accounts**: Single-user, privacy-focused design
- **No Analytics**: No tracking or data collection

## ðŸš€ Future Enhancements (Post-MVP)

- **Data Export**: GPX/CSV export functionality
- **Apple Watch**: Basic run control from watch
- **Route Planning**: Pre-planned route navigation
- **Advanced Analytics**: Trend analysis and insights

## ðŸ“„ License

MIT License - See [LICENSE](./LICENSE) file for details.

## ðŸ¤ Contributing

This is a personal project, but contributions are welcome! Please ensure all contributions follow our clean architecture principles and code quality standards.

### Before Contributing
1. Read the [Clean Architecture Guide](./docs/clean-architecture/index.md)
2. Review [SOLID Principles](./docs/clean-architecture/principles/solid-principles.md)
3. Follow [Naming Conventions](./docs/clean-architecture/guidelines/naming-conventions.md)
4. Ensure [File Structure](./docs/clean-architecture/guidelines/file-structure.md) compliance

---

*Built with â¤ï¸ using Clean Architecture, SOLID principles, and privacy-first design.*

