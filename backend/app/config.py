import os
from dotenv import load_dotenv

# Load env variables from a .env file if it exists
load_dotenv()

class Settings:
    PROJECT_NAME: str = "Carbon Footprint Awareness API"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/carbon_db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your_super_secret_jwt_key_here")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 1 day
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()
