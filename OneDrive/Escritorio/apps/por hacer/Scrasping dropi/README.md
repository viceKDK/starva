# Dropi Scraping Web App

Herramienta web para obtener insights de productos en Dropi mediante scraping (o API oficial si existe), con foco en identificar items rentables (8-60 USD), comparar vendedores y priorizar oportunidades.

## Documentacion
- Especificacion tecnica: `docs/DOCS.md`
- PRD (pasos accionables y criterios): `docs/PRD.md`

## Estado del proyecto
- Backend:
  - [x] Esqueleto FastAPI con healthcheck.
  - [x] Autenticacion basica (registro/login) con JWT y endpoint protegido.
  - [x] Capa de persistencia con SQLAlchemy y modelos iniciales (users, products, vendors, prices, categories).
  - [x] Pruebas automatizadas de autenticacion (`pytest`).
- Frontend: pendiente.

## Requisitos (previstos)
- Python 3.11+
- Node 18+ (opcional para frontend)

## Desarrollo local (borrador)
- Variables en `.env` (ver y copiar desde `.env.example`)
- Backend:
  - Crear venv: `py -3.11 -m venv .venv`
  - Activar: `.\\.venv\\Scripts\\Activate`
  - Instalar deps: `pip install -r requirements.txt`
  - Ejecutar migraciones iniciales (se crean en el arranque de la app)
  - Ejecutar: `uvicorn backend.main:app --reload`
  - Probar autenticacion: `pytest`
- Frontend (opcional):
  - `cd frontend`
  - `npm install`
  - `npm run dev`

## Politica de commits
- Siempre que se cierre un PRD, una seccion del PRD o un hito, crear un commit local describiendo el alcance.
- Ejemplo: `git commit -m "docs(prd): cerrar version v1 con pasos accionables"`

## Flujo de PRs
1. Crea una rama desde `main`.
2. Implementa una parte del plan del PRD.
3. Actualiza la documentacion si aplica.
4. Abre un Pull Request usando la plantilla y referencia a `docs/PRD.md`.
5. Tras aprobar y mergear, crea tag si corresponde al hito.

## Avisos
- Respetar Terminos de Servicio de Dropi. Si existe API oficial, preferirla sobre scraping.
- No almacenar credenciales en el repositorio. Usar `.env` y secretos.
