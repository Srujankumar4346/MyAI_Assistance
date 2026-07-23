import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from backend.core.config import settings
from backend.database.connection import engine, Base
from backend.routers import router as api_router
from backend.utils.logger import logger

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Backend API for NOVA_X (Neural Operating Virtual Assistance)"
)

from backend.middleware.logging_middleware import LoggingMiddleware

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging Middleware
app.add_middleware(LoggingMiddleware)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred in NOVA_X OS. Please check logs for details."}
    )

app.include_router(api_router)

@app.get("/api-status")
def read_root():
    return {"status": "online", "message": f"Welcome to {settings.APP_NAME} Backend API. Visit /docs for documentation."}

@app.on_event("startup")
async def startup_event():
    logger.info(f"Started {settings.APP_NAME} v{settings.VERSION}")

# Serve React frontend static files
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
FRONTEND_ASSETS = FRONTEND_DIST / "assets"

if FRONTEND_DIST.exists() and FRONTEND_ASSETS.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_ASSETS)), name="assets")

    @app.get("/")
    def serve_root():
        return FileResponse(str(FRONTEND_DIST / "index.html"))

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        # Serve API docs normally
        if full_path.startswith("docs") or full_path.startswith("openapi") or full_path.startswith("api"):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIST / "index.html"))
else:
    logger.warning(f"Frontend dist not found at {FRONTEND_DIST}. Serving API only.")

    @app.get("/")
    def read_root():
        return {"status": "online", "message": f"Welcome to {settings.APP_NAME} Backend API. Visit /docs for documentation."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
