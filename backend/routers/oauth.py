import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from backend.core.config import settings
from backend.database.connection import get_db
from backend.database.models import User
from backend.security.auth import create_access_token
from backend.utils.logger import logger

router = APIRouter(prefix="/auth")

# Provider Authorize Endpoints
@router.get("/google")
def google_login():
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Google Client ID is not configured in backend environment.")
    redirect_uri = f"{settings.FRONTEND_URL}/api/auth/google/callback"
    url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope=openid%20email%20profile"
    )
    return RedirectResponse(url)

@router.get("/github")
def github_login():
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(status_code=400, detail="GitHub Client ID is not configured in backend environment.")
    redirect_uri = f"{settings.FRONTEND_URL}/api/auth/github/callback"
    url = (
        f"https://github.com/login/oauth/authorize?"
        f"client_id={settings.GITHUB_CLIENT_ID}&"
        f"redirect_uri={redirect_uri}&"
        f"scope=user:email"
    )
    return RedirectResponse(url)

@router.get("/facebook")
def facebook_login():
    if not settings.FACEBOOK_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Facebook App ID is not configured in backend environment.")
    redirect_uri = f"{settings.FRONTEND_URL}/api/auth/facebook/callback"
    url = (
        f"https://www.facebook.com/v19.0/dialog/oauth?"
        f"client_id={settings.FACEBOOK_CLIENT_ID}&"
        f"redirect_uri={redirect_uri}&"
        f"scope=email,public_profile"
    )
    return RedirectResponse(url)

@router.get("/apple")
def apple_login():
    if not settings.APPLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Apple Services ID is not configured in backend environment.")
    redirect_uri = f"{settings.FRONTEND_URL}/api/auth/apple/callback"
    url = (
        f"https://appleid.apple.com/auth/authorize?"
        f"client_id={settings.APPLE_CLIENT_ID}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code%20id_token&"
        f"scope=name%20email&"
        f"response_mode=form_post"
    )
    return RedirectResponse(url)

# Callback Helper
def _get_or_create_social_user(db: Session, email: str, name: str, provider: str, provider_id: str) -> str:
    username = name.replace(" ", "_").lower() if name else email.split("@")[0]
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = db.query(User).filter(User.username == username).first()
        if user:
            username = f"{username}_{provider[:3]}"
        user = User(
            username=username,
            email=email,
            provider=provider,
            provider_id=provider_id,
            hashed_password=None
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    token = create_access_token(data={"sub": user.username})
    return f"{settings.FRONTEND_URL}/#/?token={token}&username={user.username}"

@router.get("/google/callback")
async def google_callback(code: str = Query(...), db: Session = Depends(get_db)):
    redirect_uri = f"{settings.FRONTEND_URL}/api/auth/google/callback"
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Failed to get token from Google.")
        
        user_info_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        info = user_info_res.json()
        email = info.get("email")
        name = info.get("name", email.split("@")[0])
        sub = info.get("id")

    redirect_target = _get_or_create_social_user(db, email, name, "google", sub)
    return RedirectResponse(redirect_target)

@router.get("/github/callback")
async def github_callback(code: str = Query(...), db: Session = Depends(get_db)):
    redirect_uri = f"{settings.FRONTEND_URL}/api/auth/github/callback"
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Failed to get token from GitHub.")

        user_res = await client.get("https://api.github.com/user", headers={"Authorization": f"Bearer {access_token}"})
        info = user_res.json()
        
        email = info.get("email")
        if not email:
            emails_res = await client.get("https://api.github.com/user/emails", headers={"Authorization": f"Bearer {access_token}"})
            emails = emails_res.json()
            primary = next((e for e in emails if e.get("primary")), None)
            email = primary.get("email") if primary else f"{info.get('login')}@github.user"

        name = info.get("name") or info.get("login")
        sub = str(info.get("id"))

    redirect_target = _get_or_create_social_user(db, email, name, "github", sub)
    return RedirectResponse(redirect_target)
