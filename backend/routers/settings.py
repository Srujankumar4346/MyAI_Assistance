from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.database.models import User
from backend.schemas.schemas import AppSettingsSchema
from backend.security.auth import get_current_user
from backend.controllers.settings_controller import get_settings_controller, update_settings_controller

router = APIRouter()

@router.get("/settings", response_model=AppSettingsSchema)
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_settings_controller(db, current_user)

@router.post("/settings", response_model=AppSettingsSchema)
def update_settings(payload: AppSettingsSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return update_settings_controller(payload, db, current_user)
