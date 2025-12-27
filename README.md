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
