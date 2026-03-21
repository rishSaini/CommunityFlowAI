"""FastAPI application entry point.

Source of truth: core.md §18.2 — app setup, CORS, router registration, WebSocket
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.models.database import engine, Base
from app.routers import (
    auth_routes, requests, chatbot, locations, materials,
    dispatch, employees, briefs, analytics, search, admin,
)
from app.services.ws_manager import manager


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Create all tables on startup."""
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="CCH Ordering & Dispatch System",
    description="AI-powered platform for managing health education material requests and staff dispatch across Utah.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Router registration ─────────────────────────────────────
app.include_router(auth_routes.router, prefix="/api")
app.include_router(requests.router, prefix="/api")
app.include_router(chatbot.router, prefix="/api")
app.include_router(locations.router, prefix="/api")
app.include_router(materials.router, prefix="/api")
app.include_router(dispatch.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(briefs.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


# ── Health check ─────────────────────────────────────────────
@app.get("/api/health")
def health_check():
    """Basic health check endpoint."""
    return {"status": "ok", "service": "cch-backend"}


# ── WebSocket ────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time updates for connected dashboards."""
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
