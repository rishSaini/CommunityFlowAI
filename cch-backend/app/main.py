"""FastAPI application entry point.

Source of truth: core.md §18.2, PHASE_1 — app setup, CORS, router registration
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models.database import engine, Base
from app.routers import auth_routes

app = FastAPI(
    title="CCH Ordering & Dispatch System",
    description="AI-powered platform for managing health education material requests and staff dispatch across Utah.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api")


@app.on_event("startup")
def on_startup():
    """Create all tables on first run."""
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health_check():
    """Basic health check endpoint."""
    return {"status": "ok", "service": "cch-backend"}
