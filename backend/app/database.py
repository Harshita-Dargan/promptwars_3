from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

DATABASE_URL = settings.DATABASE_URL

# Fallback to local SQLite if no postgres database URL is provided
if not DATABASE_URL or DATABASE_URL == "postgresql://postgres:postgres@localhost:5432/carbon_db":
    # Let's check if we should default to sqlite to avoid failures on first run
    import os
    if not os.getenv("DATABASE_URL"):
        DATABASE_URL = "sqlite:///./carbon.db"

# SQLite specific connect args
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
