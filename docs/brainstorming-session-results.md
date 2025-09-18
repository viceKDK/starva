# Brainstorming Session Results

**Session Date:** 2025-09-18
**Facilitator:** Business Analyst Mary
**Participant:** Vicente

## Executive Summary

**Topic:** MVP Running App para iPhone - Uso Personal

**Session Goals:** Definir funcionalidades core del MVP para app de running local, simple, sin login, similar a Strava pero para uso personal

**Techniques Used:** Morphological Analysis, User Journey Mapping, Assumption Reversal

**Total Ideas Generated:** 15+ componentes y decisiones clave definidas

**Key Themes Identified:**
- Simplicidad extrema - solo lo esencial
- Local y personal - sin cuentas ni sharing
- Enfoque en tracking y records personales
- Tecnología: Expo + SQLite

## Technique Sessions

### Morphological Analysis - 15 minutos

**Description:** Descomposición de la app en componentes principales y exploración de opciones para cada uno

**Ideas Generated:**
1. Tracking: GPS, tiempo total, distancia total, velocidad promedio
2. Mapa: Solo mostrar recorrido al terminar (no en tiempo real)
3. Almacenamiento: SQLite local
4. Historial: Lista por fecha + Records personales (PR)

**Insights Discovered:**
- El usuario quiere nivel intermedio de datos (no básico, no avanzado)
- No necesita mapa en tiempo real, solo resumen final
- SQLite es suficiente para almacenamiento local
- Enfoque en simplicidad tipo Strava pero más minimalista

**Notable Connections:**
- Todas las funcionalidades apuntan a simplicidad y uso personal
- No hay necesidad de funciones sociales o complejas

### User Journey Mapping - 10 minutos

**Description:** Mapeo completo del flujo de usuario desde abrir app hasta ver records

**Ideas Generated:**
1. Pantalla principal: Botón "INICIAR CARRERA"
2. Durante carrera: Tiempo, distancia, velocidad en pantalla
3. Botones: Iniciar, Pausar, Terminar
4. Al terminar: Resumen + mapa del recorrido
5. Guardar en SQLite
6. Historial: Lista de carreras, tocar para ver detalles

**Insights Discovered:**
- Flujo lineal y simple sin complicaciones
- Usuario prefiere ver mapa solo al final
- Interfaz minimalista durante la carrera

**Notable Connections:**
- El journey confirma la necesidad de simplicidad identificada en análisis morfológico

### Assumption Reversal - 10 minutos

**Description:** Cuestionamiento de qué eliminar para máxima simplicidad en el MVP

**Ideas Generated:**
1. MANTENER: Pausar carrera, editar carreras
2. ELIMINAR: Calorías, diferentes unidades (solo km), alertas audio
3. ELIMINAR: Compartir, configuraciones, múltiples tipos actividad
4. MANTENER: Solo correr (no caminar/bici)
5. SIMPLIFICAR: Una app ultra-enfocada

**Insights Discovered:**
- Usuario tiene claridad extrema sobre qué NO quiere
- Prefiere funcionalidad básica pero bien hecha
- Pausar y editar son funcionalidades críticas que no se pueden eliminar

**Notable Connections:**
- La eliminación agresiva de features alinea perfectamente con el objetivo de MVP personal

## Idea Categorization

### Immediate Opportunities
*Ideas ready to implement now*

1. **Core Tracking Engine**
   - Description: GPS tracking con tiempo, distancia, velocidad promedio
   - Why immediate: Funcionalidad base esencial, Expo tiene APIs ready
   - Resources needed: Expo Location API, estado local para tracking

2. **SQLite Storage Setup**
   - Description: Base de datos local para guardar carreras
   - Why immediate: Expo SQLite es directo, estructura simple
   - Resources needed: expo-sqlite, diseño de schema básico

3. **Basic UI Structure**
   - Description: Pantalla principal + pantalla de carrera + historial
   - Why immediate: UI minimalista, solo 3-4 pantallas principales
   - Resources needed: React Navigation, componentes básicos

### Future Innovations
*Ideas requiring development/research*

1. **Map Integration & Route Display**
   - Description: Mostrar recorrido en mapa al terminar carrera
   - Development needed: Integración con MapView, renderizado de rutas GPS
   - Timeline estimate: Después del core tracking

2. **Personal Records Algorithm**
   - Description: Calcular y mostrar PRs automáticamente por distancia
   - Development needed: Lógica para detectar mejores tiempos por distancia
   - Timeline estimate: Una vez que tenga datos de múltiples carreras

3. **Edit Run Functionality**
   - Description: Permitir editar datos de carreras guardadas
   - Development needed: UI de edición, validación de datos, update en DB
   - Timeline estimate: Feature secundaria post-MVP básico

### Moonshots
*Ambitious, transformative concepts*

1. **Auto-Route Recognition**
   - Description: Detectar automáticamente rutas frecuentes y compararlas
   - Transformative potential: Convertir app simple en coach personal inteligente
   - Challenges to overcome: Algoritmos de matching de rutas, complejidad

### Insights & Learnings

- **Claridad de visión**: Usuario tiene expectativas muy claras y específicas sobre funcionalidad
- **Simplicidad como feature**: La eliminación agresiva de funcionalidades es una ventaja, no limitación
- **MVP bien definido**: Scope perfectamente delimitado para desarrollo eficiente
- **Personal > Social**: Enfoque en mejora personal vs. comparación social es diferenciador clave

## Action Planning

### Top 3 Priority Ideas

#### #1 Priority: Core Tracking Engine
- Rationale: Sin esto no hay app - es la funcionalidad base
- Next steps: Setup Expo project, implementar Location API, crear estado de tracking
- Resources needed: Expo CLI, expo-location, React hooks para estado
- Timeline: Primera semana de desarrollo

#### #2 Priority: SQLite Storage Setup
- Rationale: Necesario para persistir datos, estructura simple bien definida
- Next steps: Diseñar schema (runs table), implementar CRUD básico
- Resources needed: expo-sqlite, funciones async para DB operations
- Timeline: Segunda semana de desarrollo

#### #3 Priority: Basic UI Structure
- Rationale: Interface clara y simple para interactuar con funcionalidades core
- Next steps: Crear navegación, pantallas principales, botones básicos
- Resources needed: React Navigation, estilos minimalistas
- Timeline: Paralelo con storage, tercera semana

## Reflection & Follow-up

### What Worked Well
- Morfological analysis identificó componentes clave rápidamente
- User journey mapping confirmó flujo simple y directo
- Assumption reversal eliminó scope creep efectivamente
- Usuario muy claro en sus requerimientos

### Areas for Further Exploration
- Integración específica de mapas: Qué librería usar para Expo
- Schema detallado de base de datos: Campos exactos y tipos de datos
- UX específico: Colores, fonts, layout exacto de pantallas
- Testing en dispositivo: Comportamiento real de GPS tracking

### Recommended Follow-up Techniques
- SCAMPER Method: Para refinar cada funcionalidad específica
- First Principles Thinking: Para decisiones técnicas (qué librería de mapas, etc.)
- Question Storming: Para identificar edge cases y scenarios de uso

### Questions That Emerged
- ¿Qué pasa si se pierde señal GPS durante carrera?
- ¿Cómo manejar runs muy cortos vs muy largos?
- ¿Formato exacto para mostrar velocidad (min/km vs km/h)?
- ¿Backup de datos? ¿Export capability?

### Next Session Planning
- **Suggested topics:** Decisiones técnicas específicas, diseño de schema DB, wireframes de UI
- **Recommended timeframe:** Una vez que comience desarrollo y surjan dudas técnicas
- **Preparation needed:** Research de librerías Expo para mapas y tracking GPS

---

*Session facilitated using the BMAD-METHOD™ brainstorming framework*