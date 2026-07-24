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
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.memory import MemoryJobStore
# Phase 1/2 models must be imported before Phase 3 so FK resolution works
import backend.database.models  # noqa: F401
# Phase 3 — Neural Memory Engine models
import backend.memory_engine.models  # noqa: F401
# Phase 4 — Desktop Automation Engine models
import backend.desktop_engine.models  # noqa: F401
# Phase 5 — Browser Automation Engine models
import backend.browser_engine.models  # noqa: F401

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
    logger.info(f"Configured ADMIN_USERNAME = '{settings.ADMIN_USERNAME}'")
    logger.info(f"DATABASE_URL = '{settings.DATABASE_URL}'")
    
    # Initialize Scheduler
    jobstores = {
        'default': MemoryJobStore()
    }
    app.state.scheduler = AsyncIOScheduler(jobstores=jobstores)
    
    # Register Phase 3 Memory & Learning Tasks
    app.state.scheduler.add_job(
        id="memory_decay_task",
        func="backend.memory_engine.tasks:run_memory_decay",
        trigger="interval",
        minutes=60,
        replace_existing=True
    )
    
    app.state.scheduler.add_job(
        id="learning_reinforcement_task",
        func="backend.memory_engine.tasks:run_learning_reinforcement",
        trigger="interval",
        minutes=30,
        replace_existing=True
    )
    
    # Register Phase 4 Desktop Scheduled Tasks
    app.state.scheduler.add_job(
        id="desktop_scheduled_tasks",
        func="backend.desktop_engine.tasks:run_desktop_scheduler",
        trigger="interval",
        seconds=15,
        replace_existing=True
    )
    
    app.state.scheduler.start()
    logger.info("APScheduler started with MemoryJobStore.")

@app.on_event("shutdown")
async def shutdown_event():
    if hasattr(app.state, 'scheduler'):
        app.state.scheduler.shutdown()
        logger.info("APScheduler stopped.")


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
