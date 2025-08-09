from typing import Generator
from sqlalchemy.orm import Session
from app.db.database import SessionLocal


def get_db() -> Generator:
    """Get database session."""
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()