# Clean Architecture Guide for Personal Running Tracker MVP

## Documentation Overview

Esta documentación está organizizada siguiendo principios de **Clean Architecture**, **SOLID**, **GRASP** y **Clean Code** aplicados específicamente a nuestro proyecto React Native con Expo.

## File Organization Rules

- **Maximum file size**: 500 lines (split at 450 lines)
- **Maximum class size**: 200 lines (split into helper classes)
- **Maximum function size**: 30-50 lines
- **Meaningful naming**: All variables, classes, methods must be descriptive and intention-revealing
- **Avoid vague naming**: No generic names like `data`, `info`, `manager`

## Core References

### Essential Books Applied
- **Clean Code** (Robert C. Martin)
- **Design Patterns** (GoF)
- **Refactoring** (Martin Fowler)
- **Growing Object-Oriented Software, Guided by Tests** (Freeman & Pryce)

## Architecture Sections

### [Core Principles](./principles/)
- [SOLID Principles](./principles/solid-principles.md)
- [GRASP Principles](./principles/grasp-principles.md)
- [Clean Code Rules](./principles/clean-code-rules.md)
- [Dependency Injection](./principles/dependency-injection.md)

### [Design Patterns](./patterns/)
- [Creational Patterns](./patterns/creational-patterns.md)
- [Structural Patterns](./patterns/structural-patterns.md)
- [Behavioral Patterns](./patterns/behavioral-patterns.md)
- [Result Pattern](./patterns/result-pattern.md)

### [Architecture Layers](./layers/)
- [Presentation Layer](./layers/presentation-layer.md)
- [Business Logic Layer](./layers/business-logic-layer.md)
- [Data Access Layer](./layers/data-access-layer.md)
- [Navigation Coordinator](./layers/navigation-coordinator.md)

### [Implementation Guidelines](./guidelines/)
- [File Structure](./guidelines/file-structure.md)
- [Naming Conventions](./guidelines/naming-conventions.md)
- [Error Handling](./guidelines/error-handling.md)
- [Testing Strategy](./guidelines/testing-strategy.md)

### [Code Examples](./examples/)
- [Service Implementation](./examples/service-implementation.md)
- [Component Architecture](./examples/component-architecture.md)
- [State Management](./examples/state-management.md)
- [Dependency Injection Setup](./examples/dependency-injection-setup.md)

## Quick Reference

### Core Architectural Principles

#### Data Transfer Objects (DTOs)
- **Purpose**: Separar dominio de exposición
- **Benefits**:
  - Desacoplamiento de información
  - Seguridad y encapsulamiento
  - Representaciones personalizadas
  - Mejora en eficiencia

#### Dependency Injection & Service Lifetimes
- **Singleton**: Una instancia durante toda la aplicación
- **Scoped**: Una instancia por request/sesión
- **Transient**: Nueva instancia cada vez que se solicita

#### Clean Code Principles

##### Four Core Rules Applied
1. **Evitar comentarios innecesarios**: Código autodescriptivo
2. **Nombres significativos**: Variables y funciones claras
3. **Funciones pequeñas (SRP)**: Una responsabilidad por función
4. **Eliminar números mágicos**: Usar constantes o parámetros

##### Error Handling Best Practices
1. **Use Result Pattern** para manejo de errores
2. **Capturar solo donde tenga sentido** manejar el error
3. **No ocultar información** de errores originales
4. **Mantener flujo limpio** (separar manejo de errores de lógica)

## Architecture Enforcement Rules

### ✅ Required Practices
- Favor composition over inheritance
- Use dependency injection for all services
- Separate UI from business logic completely
- Implement Result Pattern for error handling
- Keep functions between 30-50 lines
- Split files at 450 lines (max 500)
- Use meaningful, intention-revealing names
- Apply design patterns to solve common problems

### ❌ Code Smells to Reject
- Methods with multiple responsibilities
- Business logic in UI components
- Magic numbers and unclear variable names
- Hard-coded dependencies
- God classes (> 200 lines)
- Long parameter lists (> 4 parameters)
- Deep nesting (> 3 levels)
- Generic exception throwing

---

*This architecture ensures our React Native app remains maintainable, testable, and scalable through principled design and clean code practices.*