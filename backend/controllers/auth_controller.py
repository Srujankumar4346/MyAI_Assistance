from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from backend.core.config import settings
from backend.database.models import User
from backend.schemas.schemas import LoginRequest, TokenResponse
from backend.security.auth import verify_password, get_password_hash, create_access_token

def login_user(payload: LoginRequest, db: Session) -> dict:
    user = db.query(User).filter(User.username == payload.username).first()
    if not user:
        if payload.username == settings.ADMIN_USERNAME and payload.password == settings.ADMIN_PASSWORD:
            user = User(
                username=settings.ADMIN_USERNAME,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD)
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(status_code=401, detail="Invalid username or password")
    else:
        if not verify_password(payload.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid username or password")

    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "username": user.username}
