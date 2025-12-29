# Household App Architecture

## Overview
Household is a small, self-hosted web app focused on shared household budgeting. It is built as a single-page frontend with a JSON API backend and a SQLite database for storage.

## Runtime Topology
- Browser connects to the frontend at `/`.
- The frontend calls the backend API under `/api`.
- The backend reads and writes SQLite data under `/data`.
- Optional Authelia forward-auth is used for SSO.

## Components

### Frontend
- React + Vite + Tailwind.
- Routes: `/` (landing), `/income`, `/expenses`, `/allocations`, `/settings`, `/login`.
- Feature logic lives in hooks under `frontend/src/hooks`.
- Shared UI lives in `frontend/src/components`.

### Backend
- FastAPI + SQLAlchemy + Alembic.
- All calculations and persistence live server-side.
- Request logging is handled in middleware and configured via env.

### Database
- SQLite file stored in a host volume (`/data/household.db`).
- Alembic migrations manage schema changes.

## Authentication
- Email/password login with JWT access and refresh tokens.
- Authelia SSO support via `/api/auth/authelia` when enabled.
- Refresh tokens are stored hashed in the database.

## Configuration
- All settings are defined via environment variables.
- Dev runs with `.env.dev` and Traefik routing.
- Local dev uses `.env` and direct ports.

Key configuration:
- `DatabaseUrl` for SQLite location
- `JWT_SECRET_KEY` for auth
- `AllowedOrigins` for CORS
- `AutheliaEnabled` and header names for SSO

## Logging
- Structured request logs include request id, status, and latency.
- Logs can be written to file with rotation (env controlled).

## Directory Layout
- `frontend/` UI and client logic
- `backend/` API, models, migrations
- `docs/` architecture and technical notes
- `scripts/` helper scripts for dev and local runs

## Deployment Notes
- Dev uses a single container and an external Traefik proxy.
- The SQLite data directory is bind-mounted for persistence.
