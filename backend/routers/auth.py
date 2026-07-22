from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.database.models import User
from backend.schemas.schemas import LoginRequest, TokenResponse
from backend.security.auth import get_current_user
from backend.controllers.auth_controller import login_user

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    return login_user(payload, db)

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out successfully"}
