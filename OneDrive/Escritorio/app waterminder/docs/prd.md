# WaterMinder Personal Product Requirements Document (PRD)

## Goals and Background Context

### Goals
- Crear una aplicación personal de seguimiento de hidratación con templates de recipientes (vaso 250ml, botella 500ml, etc.)
- Permitir registro personalizado de recipientes con cantidades específicas
- Implementar visualización corporal que se "llena" progresivamente hasta alcanzar el objetivo diario
- Proporcionar estadísticas detalladas por día, semana y mes del consumo de agua
- Establecer metas personalizadas de hidratación diaria
- Desarrollar una experiencia 100% offline con recordatorios locales

### Background Context
Este proyecto crea una versión personalizada de WaterMinder enfocada en simplicidad y control total de datos. La aplicación permitirá un seguimiento visual e intuitivo del consumo de agua mediante una representación corporal que se llena gradualmente, combinado con templates de recipientes comunes y la flexibilidad de agregar cantidades personalizadas. Las estadísticas temporales proporcionarán insights sobre patrones de hidratación sin complejidad innecesaria.

### Change Log
| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-08-05 | 1.0 | Initial PRD creation | PM John |

## Requirements

### Functional Requirements

**FR1:** La aplicación debe permitir registrar consumo de agua seleccionando templates predefinidos (vaso 250ml, botella 500ml, etc.)

**FR2:** El usuario debe poder agregar recipientes personalizados con cantidades específicas en mililitros

**FR3:** La aplicación debe mostrar una representación visual de una persona que se "llena" progresivamente conforme se registra el consumo

**FR4:** El sistema debe permitir establecer y modificar objetivos diarios personalizados de consumo de agua

**FR5:** La visualización corporal debe mostrar cuando se alcanza el 100% del objetivo sin penalizar el sobreconsumo

**FR6:** La aplicación debe proporcionar estadísticas de consumo con vistas por día actual, semana y mes

**FR7:** El sistema debe enviar recordatorios/notificaciones locales para beber agua en intervalos configurables

**FR8:** La aplicación debe mantener un historial completo de todo el consumo registrado

### Non-Functional Requirements

**NFR1:** La aplicación debe funcionar completamente offline utilizando SQLite para almacenamiento local

**NFR2:** La interfaz debe ser responsiva y optimizada para dispositivos móviles con React Native

**NFR3:** Los datos deben persistir localmente sin requerir conexión a internet o servicios externos

**NFR4:** La aplicación debe iniciar en menos de 3 segundos en dispositivos promedio

**NFR5:** Las notificaciones deben funcionar incluso cuando la app está cerrada o en background

## User Interface Design Goals

### Overall UX Vision
La aplicación debe ofrecer una experiencia visual e intuitiva centrada en la simplicidad y el feedback inmediato. El diseño debe ser minimalista pero atractivo, con la representación corporal como elemento central que proporcione satisfacción visual al ver el progreso. La navegación debe ser fluida entre las tres vistas principales: registro, progreso visual y estadísticas.

### Key Interaction Paradigms
- **One-tap logging**: Registro de consumo con un solo toque seleccionando templates
- **Visual feedback**: Animación inmediata de la figura corporal al registrar agua
- **Swipe navigation**: Navegación horizontal entre secciones principales
- **Long-press customization**: Mantener presionado para editar o agregar recipientes personalizados

### Core Screens and Views
- **Home/Progress Screen**: Pantalla principal con la figura corporal y progreso del día
- **Quick Log Panel**: Botones de templates de recipientes para registro rápido
- **Statistics Dashboard**: Gráficos y métricas por día/semana/mes
- **Settings Screen**: Configuración de objetivos, recordatorios y templates personalizados
- **Custom Container Creator**: Modal para agregar recipientes personalizados

### Accessibility
WCAG AA - Cumplimiento con estándares de accesibilidad para garantizar usabilidad universal

### Branding
Diseño limpio y moderno inspirado en apps de salud, con paleta de colores azules/celestes que evoquen agua. Iconografía simple y reconocible, con animaciones sutiles que no distraigan del objetivo principal.

### Target Device and Platforms
Mobile Only - Optimizado específicamente para smartphones con React Native/Expo, enfoque mobile-first

## Technical Assumptions

### Repository Structure
Monorepo - Proyecto único con React Native/Expo, ideal para una app móvil standalone

### Service Architecture
**CRITICAL DECISION**: Arquitectura móvil monolítica offline-first. La aplicación será completamente self-contained sin servicios externos, con SQLite como única fuente de datos y todas las funcionalidades ejecutándose localmente en el dispositivo.

### Testing Requirements
**CRITICAL DECISION**: Enfoque de testing centrado en Unit + Integration testing. Se incluirán tests unitarios para la lógica de negocio (cálculos de hidratación, manejo de datos) y tests de integración para verificar la persistencia SQLite y las notificaciones locales.

### Additional Technical Assumptions and Requests

**Frontend Framework**: React Native con Expo SDK para desarrollo ágil y cross-platform
- **Rationale**: Permite desarrollo rápido con acceso nativo a notificaciones y almacenamiento

**Base de Datos**: SQLite con expo-sqlite
- **Rationale**: Almacenamiento local robusto, 100% offline, sin dependencias de red

**Notificaciones**: expo-notifications 
- **Rationale**: Recordatorios locales que funcionan en background sin servicios externos

**Gráficas y Visualizaciones**: react-native-svg + react-native-circular-progress
- **Rationale**: Para mostrar el progreso diario con diseño tipo WaterMinder y visualización corporal

**Gestión de Estado**: React Context + useReducer
- **Rationale**: Manejo de estado simple para datos de hidratación y configuración

**Animaciones**: React Native Reanimated
- **Rationale**: Animaciones fluidas para la visualización corporal y transiciones

**Iconografía**: Expo Vector Icons
- **Rationale**: Íconos consistentes y optimizados para móvil