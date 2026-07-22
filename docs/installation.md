# SAI Installation & Development Guide

## Requirements
- Python 3.12+
- Node.js 18+ & npm
- Docker & Docker Compose (optional, for containerized run)
- Local Ollama installation (optional but recommended for local LLM inference)

## Environment Variables
Environment settings are defined in `backend/core/config.py` and can be overridden via a `.env` file in the root:

```env
SECRET_KEY=sai_super_secret_jwt_key_2026_change_in_production
DATABASE_URL=sqlite:///./database/sai.db
OLLAMA_BASE_URL=http://localhost:11434
DEFAULT_MODEL=gemma
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=sai_db
```

## Running Verification Tests
To test backend API status:
```bash
.\venv\Scripts\python.exe -c "import backend.main; print('Backend modules loaded cleanly!')"
```

## Production Running via Docker
To boot the complete application with PostgreSQL database and FastAPI backend:
```bash
docker-compose up --build
```
This serves the frontend at `http://localhost:3000` and proxying API calls to the backend on `http://localhost:8000`.
