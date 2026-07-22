from fastapi import APIRouter
from backend.routers.auth import router as auth_router
from backend.routers.chat import router as chat_router
from backend.routers.memory import router as memory_router
from backend.routers.settings import router as settings_router
from backend.routers.system import router as system_router

router = APIRouter(prefix="/api")

router.include_router(auth_router, tags=["Authentication"])
router.include_router(chat_router, tags=["Chat"])
router.include_router(memory_router, tags=["Memory"])
router.include_router(settings_router, tags=["Settings"])
router.include_router(system_router, tags=["System"])
