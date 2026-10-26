"""SEO platform API (FastAPI). Separate service from the CRM: own database, own process.

Run:  uvicorn app.main:app --port 8100
Docs: http://localhost:8100/docs
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import agent, businesses, connections, discover, growth, intake, leads, profile, system, website
from .services import scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    scheduler.start()
    yield
    scheduler.stop()


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

for r in (system, businesses, profile, growth, leads, intake, connections, discover, agent, website):
    app.include_router(r.router, prefix=settings.api_prefix)
