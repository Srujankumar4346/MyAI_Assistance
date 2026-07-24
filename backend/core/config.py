import os
import sys

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load .env file explicitly into environment variables
load_dotenv()


def _require_env(key: str) -> str:
    """Retrieve a required environment variable or abort startup with a clear error."""
    value = os.environ.get(key)
    if not value:
        print(
            f"\n[NOVA_X STARTUP ERROR] Required environment variable '{key}' is not set.\n"
            f"  Set it via: export {key}=<your_value>\n"
            f"  Or add it to your .env file / Render environment variables.\n",
            file=sys.stderr,
        )
        sys.exit(1)
    return value


class Settings(BaseSettings):
    APP_NAME: str = "NOVA_X (Neural Operating Virtual Assistance)"
    VERSION: str = "2.0.0"

    # ── Security — REQUIRED, no default ───────────────────────────────────────
    SECRET_KEY: str = ""  # populated in __init__
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./database/novax.db")

    # ── ChromaDB ──────────────────────────────────────────────────────────────
    CHROMA_DB_DIR: str = os.getenv("CHROMA_DB_DIR", "./memory/chroma_storage")

    # ── Ollama AI ─────────────────────────────────────────────────────────────
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "llama3.1:8b")

    # ── Admin Credentials ─────────────────────────────────────────────────────
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin123")

    # ── OAuth 2.0 Credentials ──────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")
    FACEBOOK_CLIENT_ID: str = os.getenv("FACEBOOK_CLIENT_ID", "")
    FACEBOOK_CLIENT_SECRET: str = os.getenv("FACEBOOK_CLIENT_SECRET", "")
    APPLE_CLIENT_ID: str = os.getenv("APPLE_CLIENT_ID", "")
    APPLE_CLIENT_SECRET: str = os.getenv("APPLE_CLIENT_SECRET", "")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # ── Gemini (cloud AI fallback) ────────────────────────────────────────────
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # ── Browser Engine Feature Flags ──────────────────────────────────────────
    BROWSER_ENABLED: bool = os.getenv("BROWSER_ENABLED", "True").lower() in ("true", "1", "yes")
    BROWSER_RESEARCH: bool = os.getenv("BROWSER_RESEARCH", "True").lower() in ("true", "1", "yes")
    BROWSER_DOWNLOADS: bool = os.getenv("BROWSER_DOWNLOADS", "True").lower() in ("true", "1", "yes")
    BROWSER_FORMS: bool = os.getenv("BROWSER_FORMS", "True").lower() in ("true", "1", "yes")
    BROWSER_MEMORY: bool = os.getenv("BROWSER_MEMORY", "True").lower() in ("true", "1", "yes")
    BROWSER_WEBSOCKET: bool = os.getenv("BROWSER_WEBSOCKET", "True").lower() in ("true", "1", "yes")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Enforce required SECRET_KEY at startup
        self.SECRET_KEY = _require_env("SECRET_KEY")

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
