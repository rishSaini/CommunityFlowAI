"""SQLAlchemy engine, session factory, and declarative base.

Source of truth: core.md §14 — SQLite + SQLAlchemy 2.0, check_same_thread=False
"""
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Resolve cch.db relative to cch-backend/ (three levels up: models → app → cch-backend)
_DB_PATH = Path(__file__).resolve().parent.parent.parent / "cch.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{_DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
