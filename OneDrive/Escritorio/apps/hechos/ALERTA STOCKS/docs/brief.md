# Project Brief: Aplicación Personal de Alertas de Precios WhatsApp

**Fecha:** 2025-08-27  
**Usuario:** Uso Interno/Personal

## Executive Summary

**Aplicación de escritorio ligera (servidor local + interfaz web) que monitorea precios de activos financieros y envía alertas automáticas por WhatsApp cuando se cumplen condiciones específicas.** Esta herramienta personal elimina la necesidad de revisar precios manualmente, proporcionando notificaciones instantáneas y reduciendo la ansiedad de estar constantemente monitoreando los mercados.

**Valor clave:** Paz mental + timing advantage + protección del foco durante trabajo.

## Problem Statement

**Problema actual:** Revisar constantemente precios de acciones y criptomonedas interrumpe el trabajo y genera ansiedad. Los métodos actuales requieren:
- Abrir apps/websites repetidamente 
- Configurar alertas en múltiples plataformas
- Recibir notificaciones inconsistentes o tardías
- Perder oportunidades por no estar monitoreando constantemente

**Impacto:** Pérdida de productividad, estrés innecesario, decisiones de timing subóptimas.

**Por qué resolver ahora:** Con mercados volátiles, tener alertas confiables e inmediatas puede ser la diferencia entre aprovechar oportunidades o perderlas.

## Proposed Solution

**Solución simple:** Aplicación local Python que:
1. Permite configurar alertas de precio (≥ o ≤ umbrales)
2. Monitorea automáticamente cada 1-5 minutos
3. Envía mensajes WhatsApp instantáneos cuando se activan
4. Incluye sistema anti-spam inteligente
5. Interfaz web simple para gestionar alertas

**Diferenciador clave:** Totalmente personal, sin dependencias externas para funcionar, mensajes directos a tu WhatsApp personal.

## Target Users

### Primary User Segment: Usuario Personal (Tú)
- **Perfil:** Persona que monitorea activos financieros regularmente
- **Comportamiento actual:** Revisa precios manualmente, usa apps múltiples
- **Necesidades específicas:** Alertas confiables sin interrumpir trabajo
- **Objetivo:** Recibir notificaciones oportunas sin estrés de monitoreo constante

## Goals & Success Metrics

### Business Objectives
- **Reducir tiempo de monitoreo manual:** De X revisiones/día a 0
- **Mejorar timing de decisiones:** Alertas instantáneas vs. descubrimiento tardío  
- **Aumentar productividad:** Eliminar interrupciones de revisión manual

### User Success Metrics  
- **Configuración exitosa:** Crear primera alerta en <5 minutos
- **Confiabilidad:** 99% de alertas disparadas correctamente
- **Utilidad:** Usar la app diariamente por >2 semanas

### Key Performance Indicators (KPIs)
- **Tiempo de respuesta:** Alertas lleguen <1 minuto después del trigger
- **Precisión anti-spam:** 0 mensajes duplicados por cooldown
- **Uptime personal:** App funcione cuando PC esté encendida

## MVP Scope

### Core Features (Must Have)
- **Crear Alertas:** Formulario simple con activo, condición (≥/≤), precio umbral
- **Listar Alertas:** Tabla con todas las alertas y su estado (activa/inactiva)
- **Toggle Alertas:** Activar/desactivar alertas individuales sin eliminarlas  
- **Eliminar Alertas:** Remover alertas obsoletas
- **Monitoreo Automático:** Checker cada 1-5 minutos (configurable)
- **WhatsApp Alerts:** Mensajes con precio actual, condición, fecha/hora
- **Anti-Spam Básico:** Cooldown de 30 min para evitar mensajes repetidos

### Out of Scope for MVP
- Múltiples usuarios o autenticación
- Gráficos o historical data
- Notificaciones por email o Telegram  
- Backup automático a la nube
- Mobile app o acceso remoto
- Machine learning o predicciones

### MVP Success Criteria
**MVP es exitoso si puedes configurar 3-5 alertas de tus activos favoritos y recibir notificaciones WhatsApp confiables durante 1 semana sin problemas técnicos.**

## Technical Considerations

### Platform Requirements
- **Target Platform:** Windows PC (local)
- **Browser Support:** Cualquier browser moderno (Chrome, Firefox, Edge)
- **Performance:** Debe ser ligero, consumo mínimo de recursos

### Technology Preferences  
- **Backend:** Python 3 + FastAPI + SQLite
- **Frontend:** HTML + Jinja2 templates + CSS básico
- **Scheduler:** APScheduler para monitoreo automático
- **APIs:** Alpha Vantage (stocks) + CoinGecko (crypto)
- **Messaging:** Twilio WhatsApp Sandbox

### Architecture Considerations
- **Estructura:** Proyecto Python simple con templates/ y static/
- **Base de datos:** SQLite local (alerts.db)  
- **Configuración:** Archivo .env para API keys
- **Deployment:** Ejecutar localmente con uvicorn

## Constraints & Assumptions

### Constraints
- **Budget:** $0 - usar solo APIs gratuitas
- **Timeline:** 2-3 semanas máximo para MVP
- **Resources:** Solo tú desarrollando en tiempo libre
- **Technical:** Debe funcionar offline (excepto para consultar precios)

### Key Assumptions
- PC estará encendida durante horas de mercado
- Twilio Sandbox será suficiente para testing
- APIs gratuitas tendrán rate limits aceptables
- No necesitas backup/restore por ser uso personal

## Risks & Open Questions

### Key Risks
- **API Rate Limits:** Alpha Vantage 5 calls/min puede ser insuficiente con múltiples alertas
- **WhatsApp Sandbox:** Limitado a números pre-aprobados, migración a production API toma tiempo  
- **PC Downtime:** Sin alertas cuando computadora esté apagada
- **Database Corruption:** Pérdida de alertas configuradas sin backup

### Open Questions
- ¿Qué hacer si APIs están temporalmente caídas?
- ¿Necesitas "quiet hours" para no recibir alertas durmiendo?
- ¿Backup manual de SQLite es suficiente?
- ¿Cuántas alertas simultáneas necesitas realmente?

### Areas Needing Further Research
- Rate limits exactos de CoinGecko API
- Proceso de migración de Twilio Sandbox a WhatsApp Cloud API  
- Estrategias simples de backup para SQLite

## Next Steps

### Immediate Actions
1. **Setup inicial:** Crear proyecto Python con estructura básica
2. **APIs Testing:** Verificar Alpha Vantage y CoinGecko funcionando
3. **WhatsApp Setup:** Configurar Twilio Sandbox y enviar mensaje de prueba
4. **Database Design:** Crear esquema SQLite para alertas
5. **MVP Básico:** Implementar funcionalidad core sin UI
6. **Web Interface:** Agregar FastAPI + templates para gestión de alertas

### PM Handoff

Este Project Brief proporciona el contexto completo para **Aplicación Personal de Alertas de Precios WhatsApp**. El enfoque debe mantenerse en simplicidad y funcionalidad práctica para uso personal, evitando over-engineering. El éxito se mide por la utilidad real en el día a día, no por características avanzadas.