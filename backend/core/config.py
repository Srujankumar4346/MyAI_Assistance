import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "SAI (Srujan Artificial Intelligence)"
    VERSION: str = "1.0.0"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "sai_super_secret_jwt_key_2026_change_in_production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    
    # Database (PostgreSQL default, with SQLite fallback)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./database/sai.db")
    
    # ChromaDB
    CHROMA_DB_DIR: str = "./memory/chroma_storage"
    
    # Ollama AI
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "gemma")
    
    # Admin Credentials
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin123")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
