from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from backend.core.config import settings
from backend.database.models import User
from backend.schemas.schemas import LoginRequest, TokenResponse
from backend.security.auth import verify_password, get_password_hash, create_access_token
from backend.utils.logger import logger

def login_user(payload: LoginRequest, db: Session) -> dict:
    logger.info(f"Login attempt for user: {payload.username}")
    user = db.query(User).filter(User.username == payload.username).first()

    if not user:
        # First-time login: auto-create if password matches ADMIN_PASSWORD (or admin credentials match)
        is_admin_user = (payload.username == settings.ADMIN_USERNAME or payload.username.lower() == "srujankumar")
        if is_admin_user and payload.password == settings.ADMIN_PASSWORD:
            logger.info(f"Creating new admin user: {payload.username}")
            user = User(
                username=payload.username,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD)
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            logger.warning(f"Login failed: no such user '{payload.username}'")
            raise HTTPException(status_code=401, detail="Invalid username or password")
    else:
        # User exists — verify password
        if not verify_password(payload.password, user.hashed_password):
            # Password mismatch — but if the submitted creds ARE the current
            # admin env-var values, the hash in the DB is stale (e.g. from a
            # previous deploy with different env vars).  Re-hash and proceed.
            is_admin_user = (payload.username == settings.ADMIN_USERNAME or payload.username.lower() == "srujankumar")
            if is_admin_user and payload.password == settings.ADMIN_PASSWORD:
                logger.info("Admin password hash is stale — re-hashing to match current env var")
                user.hashed_password = get_password_hash(settings.ADMIN_PASSWORD)
                db.commit()
                db.refresh(user)
            else:
                logger.warning(f"Login failed: wrong password for '{payload.username}'")
                raise HTTPException(status_code=401, detail="Invalid username or password")

    access_token = create_access_token(data={"sub": user.username})
    logger.info(f"Login successful for user: {user.username}")
    return {"access_token": access_token, "token_type": "bearer", "username": user.username}
