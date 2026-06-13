import os
import secrets
from dotenv import load_dotenv

# Load env variables from a .env file if it exists
load_dotenv()

class Settings:
    PROJECT_NAME: str = "Carbon Footprint Awareness API"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/carbon_db")
    SECRET_KEY: str = os.getenv("SECRET_KEY") or secrets.token_hex(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 60 minutes for improved security
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()
