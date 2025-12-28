# Budget App

## Local dev (Docker)

```bash
docker compose up --build -d budget-dev
```

Frontend: http://localhost:5173
Backend: http://localhost:8000

## API quick test

```bash
curl http://localhost:8000/health
```

## Dev with Traefik (recommended)

```bash
./scripts/dev.sh
```

Uses `.env.dev` + `docker-compose.traefik.dev.yml` with SQLite.
Ensure `PUID`/`PGID` are set in `.env.dev` to avoid permission issues on bind mounts.
Create `frontend/node_modules` and `backend/logs` on the host once so permissions are correct.
Make sure `BUDGET_DB_DIR` exists and is writable by `PUID`/`PGID` for the SQLite file.

Frontend: https://budget-dev.${DOMAIN_PRIMARY}/
Backend: https://budget-dev.${DOMAIN_PRIMARY}/api

## Authelia SSO (optional)

- If Authelia forward-auth is enabled, `GET /api/auth/authelia` will issue tokens using the `Remote-Email` or `Remote-User` headers.
- Configure via `AutheliaEnabled`, `AutheliaHeaderEmail`, and `AutheliaHeaderUser` in `.env` if needed.

## Tax calculator

- `GET /tax-calculator/years`
- `POST /tax-calculator/estimate`

## Expenses

- `GET /expenses`
- `POST /expenses`
- `PUT /expenses/{id}`
- `DELETE /expenses/{id}`
- `PUT /expenses/order`
- `GET /expense-accounts`
- `POST /expense-accounts`
- `PUT /expense-accounts/{id}`
- `DELETE /expense-accounts/{id}`
- `GET /expense-types`
- `POST /expense-types`
- `PUT /expense-types/{id}`
- `DELETE /expense-types/{id}`
- `GET /table-preferences/{tableKey}`
- `PUT /table-preferences/{tableKey}`
