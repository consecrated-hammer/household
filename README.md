# Household

A small, self-hosted household hub with a budgeting-first workflow.

## Features
- Household landing page with a single entry into the budget module.
- Income streams with salary calculator and what-if scenarios.
- Expenses table with fast edits, filters, and totals.
- Allocations view to compare income vs expenses and split leftover.
- Settings for display preferences and finance options.
- Email/password auth plus optional Authelia SSO.

## Architecture
See `docs/ARCHITECTURE.md` for a technical overview.

## Development

Local dev (Docker):

```bash
docker compose up --build -d household-dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:8000

Dev with Traefik (recommended):

```bash
./scripts/dev.sh
```

Uses `.env.dev` + `docker-compose.traefik.dev.yml` with SQLite.
Make sure `HOUSEHOLD_DB_DIR` is writable by `PUID`/`PGID`.

Frontend: https://household-dev.${DOMAIN_PRIMARY}/  
Backend: https://household-dev.${DOMAIN_PRIMARY}/api

API quick test:

```bash
curl http://localhost:8000/health
```
