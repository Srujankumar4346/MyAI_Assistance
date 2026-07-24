from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from backend.database.connection import get_db
from backend.security.auth import get_current_user
from backend.database.models import User
from backend.desktop_engine.pipeline import desktop_pipeline
from backend.desktop_engine.permissions import PermissionLevel, ActionType
from backend.desktop_engine.automation import desktop_executors
from backend.desktop_engine.macros import macro_engine
from backend.desktop_engine.models import AutomationLog
from pydantic import BaseModel

router = APIRouter(prefix="/api/desktop", tags=["Desktop Automation"])

class ActionRequest(BaseModel):
    action_type: str
    target: str
    level: str = "MEDIUM"
    params: Dict[str, Any] = {}

@router.post("/execute")
async def execute_desktop_action(
    request: ActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Executes a desktop action through the 7-step pipeline."""
    try:
        level = PermissionLevel(request.level.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid PermissionLevel")
        
    try:
        action_type_enum = ActionType(request.action_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid action_type enum value: {request.action_type}")
        
    executor = desktop_executors.get(request.action_type)
    if not executor:
        raise HTTPException(status_code=400, detail=f"Unknown executor for action: {request.action_type}")
        
    result = desktop_pipeline.execute_action(
        db=db,
        user_id=current_user.id,
        action_type=action_type_enum,
        target=request.target,
        level=level,
        params=request.params,
        executor_func=executor
    )
    
    # Step 6 & 7: Neural Memory and Learning Engine would be triggered here as BackgroundTasks
    # (Omitted from MVP for brevity, to be added later)
    
    return result

@router.get("/logs")
async def get_automation_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = db.query(AutomationLog).filter_by(user_id=current_user.id).order_by(AutomationLog.created_at.desc()).limit(limit).all()
    return logs

class MacroRequest(BaseModel):
    name: str
    trigger_phrase: str
    steps: List[Dict[str, Any]]

@router.post("/macro/create")
async def create_macro(
    request: MacroRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    macro = macro_engine.save_macro(db, current_user.id, request.name, request.trigger_phrase, request.steps)
    return {"status": "success", "macro_id": macro.id}

@router.post("/macro/execute/{macro_id}")
async def execute_macro(
    macro_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    context = {"executors": desktop_executors}
    try:
        res = macro_engine.execute_macro(db, current_user.id, macro_id, desktop_pipeline, context)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
