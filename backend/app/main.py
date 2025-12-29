import logging
import time
import uuid
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.logging import configure_logging
from app.core.config import settings
from app.routes.auth import router as auth_router
from app.routes.income_streams import router as income_router
from app.routes.scenarios import router as scenario_router
from app.routes.tax_calculator import router as tax_calculator_router
from app.routes.expenses import router as expense_router
from app.routes.expense_accounts import router as expense_account_router
from app.routes.expense_types import router as expense_type_router
from app.routes.table_preferences import router as table_preferences_router


def CreateApp() -> FastAPI:
    configure_logging()
    app = FastAPI(title="Household API")

    allowed_origins = [origin.strip() for origin in settings.AllowedOrigins.split(",") if origin.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def LogRequests(request: Request, call_next):
        request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
        logger = logging.getLogger("request")
        start = time.time()
        response = await call_next(request)
        duration_ms = int((time.time() - start) * 1000)
        try:
            status_phrase = HTTPStatus(response.status_code).phrase
        except ValueError:
            status_phrase = "Unknown"
        logger.info(
            "%s %s %s %s %s",
            request.method,
            request.url.path,
            response.status_code,
            status_phrase,
            duration_ms,
            extra={"RequestId": request_id},
        )
        response.headers["X-Request-Id"] = request_id
        return response

    @app.get("/health")
    def Health() -> dict:
        return {"Status": "ok"}

    app.include_router(auth_router)
    app.include_router(income_router)
    app.include_router(scenario_router)
    app.include_router(tax_calculator_router)
    app.include_router(expense_router)
    app.include_router(expense_account_router)
    app.include_router(expense_type_router)
    app.include_router(table_preferences_router)
    return app


app = CreateApp()
