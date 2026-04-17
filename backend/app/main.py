from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from sqlalchemy import text

from app.database import Base, engine
from app.routers import alerts, dashboard, gauges, ingest


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Idempotent column migrations (ADD COLUMN IF NOT EXISTS is safe to re-run)
        await conn.execute(text("ALTER TABLE gauges ADD COLUMN IF NOT EXISTS latitude FLOAT"))
        await conn.execute(text("ALTER TABLE gauges ADD COLUMN IF NOT EXISTS longitude FLOAT"))
        await conn.execute(text("ALTER TABLE gauges ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE"))
    yield


app = FastAPI(title="River Gauge API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def no_cache(request: Request, call_next) -> Response:
    """Prevent Vercel/CDN from caching API responses."""
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return response

app.include_router(alerts.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(gauges.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
