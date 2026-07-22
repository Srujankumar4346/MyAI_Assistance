from fastapi import APIRouter, Depends
from backend.database.models import User
from backend.security.auth import get_current_user
from backend.controllers.system_controller import get_health, get_system, get_system_logs, list_models

router = APIRouter()

@router.get("/health")
def health():
    return get_health()

@router.get("/system")
def system_info(current_user: User = Depends(get_current_user)):
    return get_system()

@router.get("/logs")
def system_logs(limit: int = 50, current_user: User = Depends(get_current_user)):
    return get_system_logs(limit)

@router.get("/models")
async def models_list(current_user: User = Depends(get_current_user)):
    return await list_models()
