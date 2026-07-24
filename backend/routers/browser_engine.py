from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Any, List, Optional
import time
import uuid
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.security.auth import get_current_user
from backend.database.models import User
from backend.browser_engine.session_manager import browser_session_manager
from backend.utils.logger import logger

router = APIRouter(prefix="/api/browser", tags=["Browser Engine"])

# --- Models ---
class StandardResponse(BaseModel):
    success: bool
    timestamp: float
    request_id: str
    data: Optional[Dict[str, Any]] = None
    errors: Optional[List[str]] = None
    version: str = "1.0"

class CreateSessionRequest(BaseModel):
    workspace_id: str

class OpenTabRequest(BaseModel):
    url: str

class TabActionRequest(BaseModel):
    tab_id: str

def create_response(data: Dict[str, Any] = None, errors: List[str] = None) -> StandardResponse:
    return StandardResponse(
        success=errors is None or len(errors) == 0,
        timestamp=time.time(),
        request_id=str(uuid.uuid4()),
        data=data,
        errors=errors
    )

# --- Query APIs (Read) ---

@router.get("/status", response_model=StandardResponse)
async def get_browser_status(current_user: User = Depends(get_current_user)):
    try:
        status = browser_session_manager.get_health_status()
        return create_response(data={"status": status})
    except Exception as e:
        logger.error(f"Failed to get browser status: {e}")
        return create_response(errors=[str(e)])

@router.get("/health", response_model=StandardResponse)
async def get_browser_health(current_user: User = Depends(get_current_user)):
    try:
        health = browser_session_manager.get_health_status()
        return create_response(data={"health": health})
    except Exception as e:
        logger.error(f"Failed to get browser health: {e}")
        return create_response(errors=[str(e)])

@router.get("/sessions", response_model=StandardResponse)
async def get_active_sessions(current_user: User = Depends(get_current_user)):
    try:
        sessions = browser_session_manager.active_sessions
        return create_response(data={"sessions": sessions})
    except Exception as e:
        return create_response(errors=[str(e)])

@router.get("/tabs", response_model=StandardResponse)
async def get_active_tabs(current_user: User = Depends(get_current_user)):
    try:
        tabs = browser_session_manager.active_tabs
        return create_response(data={"tabs": tabs})
    except Exception as e:
        return create_response(errors=[str(e)])

@router.get("/downloads", response_model=StandardResponse)
async def get_active_downloads(current_user: User = Depends(get_current_user)):
    # Mocking for dashboard integration as driver download APIs are pending
    return create_response(data={"downloads": {}})

@router.get("/research", response_model=StandardResponse)
async def get_active_research(current_user: User = Depends(get_current_user)):
    # Connects to research_engine later
    return create_response(data={"research": []})

# --- Command APIs (Write) ---

@router.post("/session/create", response_model=StandardResponse)
async def create_session(req: CreateSessionRequest, current_user: User = Depends(get_current_user)):
    start_time = time.time()
    try:
        session_id = await browser_session_manager.create_session(req.workspace_id)
        logger.info(f"User {current_user.id} created session in {time.time() - start_time:.2f}s")
        return create_response(data={"session_id": session_id})
    except Exception as e:
        logger.error(f"Failed to create session: {e}")
        return create_response(errors=[str(e)])

@router.post("/session/{session_id}/close", response_model=StandardResponse)
async def close_session(session_id: str, current_user: User = Depends(get_current_user)):
    try:
        await browser_session_manager.close_session(session_id)
        return create_response(data={"message": f"Session {session_id} closed."})
    except Exception as e:
        return create_response(errors=[str(e)])

@router.post("/session/{session_id}/suspend", response_model=StandardResponse)
async def suspend_session(session_id: str, current_user: User = Depends(get_current_user)):
    try:
        await browser_session_manager.suspend_session(session_id)
        return create_response(data={"message": f"Session {session_id} suspended."})
    except Exception as e:
        return create_response(errors=[str(e)])

@router.post("/session/{session_id}/resume", response_model=StandardResponse)
async def resume_session(session_id: str, current_user: User = Depends(get_current_user)):
    try:
        await browser_session_manager.resume_session(session_id)
        return create_response(data={"message": f"Session {session_id} resumed."})
    except Exception as e:
        return create_response(errors=[str(e)])

@router.post("/session/{session_id}/tab/open", response_model=StandardResponse)
async def open_tab(session_id: str, req: OpenTabRequest, current_user: User = Depends(get_current_user)):
    try:
        tab_id = await browser_session_manager.open_tab(session_id, req.url)
        return create_response(data={"tab_id": tab_id})
    except Exception as e:
        return create_response(errors=[str(e)])

@router.post("/tab/{tab_id}/close", response_model=StandardResponse)
async def close_tab(tab_id: str, current_user: User = Depends(get_current_user)):
    try:
        await browser_session_manager.close_tab(tab_id)
        return create_response(data={"message": f"Tab {tab_id} closed."})
    except Exception as e:
        return create_response(errors=[str(e)])
