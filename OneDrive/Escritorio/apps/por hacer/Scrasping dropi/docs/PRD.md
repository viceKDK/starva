# PRD â€” Web App de Scraping para Dropi
> Estado 2025-03-10: Pasos 1-3 completados (estructura base, auth JWT, persistencia inicial).

## 1. Objetivo
Permitir a usuarios de Dropi identificar productos rentables (8â€“60 USD), comparar vendedores y priorizar oportunidades con un panel simple, datos actualizados y exportables.

## 2. Usuarios y Problemas
- Emprendedores de eâ€‘commerce: necesitan filtrar rÃ¡pido productos con potencial.
- Analistas junior: buscan comparar precios y disponibilidad entre vendedores.

## 3. Funcionalidades (Requisitos Funcionales)
1) Rankings por categorÃ­a
   - Ver top N productos por categorÃ­a con precio, vendedor y tendencia.
   - Criterios de aceptaciÃ³n:
     - `GET /analytics/top-products` devuelve lista ordenada con `name`, `category`, `price`, `vendor`, `rank`.
     - UI muestra barra/tabla filtrable por categorÃ­a y lÃ­mite N.
2) BÃºsqueda de productos similares
   - Input de texto; lista de vendedores con precio, disponibilidad y link.
   - Criterios de aceptaciÃ³n:
     - `GET /search/similar?q=...` responde â‰¤ 1.5s (P50) con â‰¥ 10 resultados cuando existen.
3) Filtro de rentabilidad (8â€“60 USD, editable en UI)
   - Excluir precios fuera de rango y permitir reconfiguraciÃ³n en la vista.
   - Criterios de aceptaciÃ³n:
     - Endpoint acepta `min/max`; UI persiste preferencia por sesiÃ³n.
4) AnÃ¡lisis/score de vendibilidad
   - Score 1â€“5 con explicaciÃ³n: â€œproblema que resuelveâ€, demanda/indicadores.
   - Criterios de aceptaciÃ³n:
     - `GET /product/:id/score` retorna `score` y `reasons`.
5) Exportaciones
   - Descargar CSV/XLSX de rankings y bÃºsqueda.
   - Criterios de aceptaciÃ³n:
     - `GET /export/csv?view=...` devuelve archivo con columnas visibles.

## 4. Requisitos No Funcionales
- Rendimiento P50 â‰¤ 1.5s en listados con datos cacheados.
- Estabilidad ante cambios menores del HTML (selectores defensivos).
- Seguridad: JWT, cifrado de credenciales Dropi, rate limiting.

## 5. MÃ©tricas de Ã‰xito
- Tiempo medio para encontrar 3 productos candidatos < 10 min.
- â‰¥ 70% de consultas dentro de rango 1.5s P50.
- â‰¥ 80% de usuarios exportan un reporte en la primera semana de uso.

## 6. Plan de EjecuciÃ³n â€” Pasos Accionables
1) InicializaciÃ³n del repositorio
   - AcciÃ³n: crear estructura `backend/`, `frontend/`, `docs/`, `.env.example`.
   - Entregable: proyecto base con scripts de arranque local.
   - DoD: backend levanta en local (`uvicorn`) y responde `/health`.
2) AutenticaciÃ³n bÃ¡sica (backend)
   - AcciÃ³n: endpoints `POST /auth/register`, `POST /auth/login` con JWT.
   - Entregable: usuarios en DB; middleware de auth.
   - DoD: tests mÃ­nimos de login; token protege un endpoint dummy.
3) Persistencia inicial
   - AcciÃ³n: migraciones/tablas para `users`, `products`, `vendors`, `prices`, `categories`.
   - Entregable: conexiÃ³n DB y migraciones aplicadas.
   - DoD: healthcheck de DB OK.
4) MÃ³dulo de scraping (login Dropi)
   - AcciÃ³n: Playwright login con credenciales del usuario (seguras); extracciÃ³n simple.
   - Entregable: funciÃ³n que navega y obtiene catÃ¡logo crudo.
   - DoD: correr scraping en entorno local con una cuenta de prueba.
5) NormalizaciÃ³n de datos
   - AcciÃ³n: mapear HTML/API a entidades (`products`, `vendors`, `prices`).
   - Entregable: inserciÃ³n/actualizaciÃ³n idempotente; Ã­ndices.
   - DoD: no duplica productos; inserta `prices` con timestamp.
6) Rankings por categorÃ­a (API + UI)
   - AcciÃ³n: `GET /analytics/top-products` y vista React con grÃ¡fico/tabla.
   - Entregable: top N por categorÃ­a con filtros.
   - DoD: P50 â‰¤ 1.5s con datos cacheados; paginaciÃ³n lista.
7) BÃºsqueda de similares (API + UI)
   - AcciÃ³n: `GET /search/similar?q=...`; input de bÃºsqueda en UI.
   - Entregable: lista con vendedor, precio, link, disponibilidad.
   - DoD: â‰¥ 10 resultados en dataset de prueba; enlaces vÃ¡lidos.
8) Filtro de rentabilidad (8â€“60 USD, configurable)
   - AcciÃ³n: parÃ¡metros `min/max` en API y controles en UI.
   - Entregable: vista persiste rango por sesiÃ³n.
   - DoD: fuera de rango no aparece; pruebas manuales OK.
9) Score de vendibilidad
   - AcciÃ³n: reglas heurÃ­sticas simples y explicaciÃ³n.
   - Entregable: endpoint `GET /product/:id/score`.
   - DoD: 3 ejemplos documentados con razones visibles en UI.
10) Exportaciones CSV/XLSX
   - AcciÃ³n: endpoints `GET /export/{tipo}`; botones en UI.
   - Entregable: descarga con columnas visibles y filtros aplicados.
   - DoD: archivos abren en Excel; separador correcto.
11) Scheduling y refresco
   - AcciÃ³n: job cada X horas; botÃ³n â€œActualizar ahoraâ€.
   - Entregable: `APScheduler` embebido; Ãºltima actualizaciÃ³n visible en UI.
   - DoD: evita solapamientos; logs claros.
12) Seguridad y lÃ­mites
   - AcciÃ³n: rate limiting bÃ¡sico, manejo de errores, secretos en `.env`.
   - Entregable: checklist de seguridad aplicada.
   - DoD: credenciales no quedan en logs; 429 en abuso.
13) Observabilidad
   - AcciÃ³n: logging estructurado y health checks.
   - Entregable: endpoint `/health`; trazas mÃ­nimas por job.
   - DoD: dashboards simples de logs.
14) Deploy inicial
   - AcciÃ³n: despliegue sin contenedores (ej. Uvicorn/Gunicorn + Nginx o servicio Windows) y variables seguras.
   - Entregable: instancia accesible; HTTPS.
   - DoD: smoke tests de endpoints clave.

## 7. Dependencias y Riesgos
- Cambios del DOM/estructura de Dropi pueden romper selectores.
- LÃ­mites o bloqueos antiâ€‘scraping: usar delays y variaciones.
- Posible API oficial: evaluar y preferir cuando estÃ© disponible.

## 8. PolÃ­tica de Commit al Finalizar un PRD o Hito
- Regla: siempre que se cierre un PRD, una secciÃ³n de PRD o un hito del plan, realizar un commit local con un mensaje claro.
- Comandos (local):
  - `git add docs/PRD.md docs/DOCS.md`
  - `git add <rutas-cambiadas>`
  - `git commit -m "docs(prd): cerrar versiÃ³n v1 con pasos accionables"`
  - Opcional: `git tag -a prd-v1 -m "PRD v1"`
- Frecuencia: mÃ­nimo al finalizar cada paso mayor del Plan de EjecuciÃ³n.
