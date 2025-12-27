# Budget App

## Local dev (Docker)

```bash
docker compose up --build
```

Frontend: http://localhost:5173
Backend: http://localhost:8000

## API quick test

```bash
curl http://localhost:8000/health
```

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
