from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.api.v1 import auth, decisions, user
from app.db import prepare_database_startup
from app.settings import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await prepare_database_startup()
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Aleator API",
        version="0.1.0",
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )

    # Add ProxyHeaders middleware first to handle X-Forwarded-* headers
    app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(decisions.router, prefix="/api/v1")
    app.include_router(user.router, prefix="/api/v1")

    @app.get("/api/health")
    async def health_check():
        return {"status": "ok", "service": "aleator"}

    return app


app = create_app()
