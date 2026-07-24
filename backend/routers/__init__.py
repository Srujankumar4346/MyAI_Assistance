from fastapi import APIRouter

from backend.routers.auth import router as auth_router
from backend.routers.browser_engine import router as browser_router
from backend.routers.browser_websocket import router as browser_ws_router
from backend.routers.chat import router as chat_router
from backend.routers.desktop_engine import router as desktop_router
from backend.routers.memory import router as memory_router
from backend.routers.memory_engine import router as memory_engine_router
from backend.routers.oauth import router as oauth_router
from backend.routers.settings import router as settings_router
from backend.routers.system import router as system_router
from backend.routers.voice import router as voice_router

router = APIRouter(prefix="/api")

router.include_router(auth_router, tags=["Authentication"])
router.include_router(oauth_router, tags=["Social OAuth"])
router.include_router(chat_router, tags=["Chat"])
router.include_router(memory_router, tags=["Memory"])
router.include_router(settings_router, tags=["Settings"])
router.include_router(system_router, tags=["System"])
router.include_router(voice_router, tags=["Voice"])
# Phase 3 — Neural Memory Engine
router.include_router(memory_engine_router, tags=["Neural Memory Engine"])
router.include_router(desktop_router, tags=["Desktop Engine"])
router.include_router(browser_router, tags=["Browser Engine"])

# WebSocket Routers
# Note: Since the websocket route is /ws/browser, we attach it without the /api prefix
# to the main app directly in main.py, OR we can let it be /api/ws/browser.
# The user's requested endpoint in browser_websocket.py is /ws/browser.
# We'll attach it to this router, making it /api/ws/browser.
router.include_router(browser_ws_router, tags=["Browser WebSockets"])
