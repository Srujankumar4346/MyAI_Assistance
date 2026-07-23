import os
from backend.services.system_service import system_service
from backend.services.ollama_service import ollama_service
from backend.utils.logger import LOGS_DIR

def get_health():
    from backend.core.config import settings
    from backend.database.connection import SessionLocal
    from backend.database.models import User
    # Diagnostic: check if the admin user exists in the DB
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == settings.ADMIN_USERNAME).first()
        user_exists = user is not None
        user_count = db.query(User).count()
        all_usernames = [u.username for u in db.query(User).all()]
    finally:
        db.close()
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "debug": {
            "admin_username_configured": settings.ADMIN_USERNAME,
            "admin_password_length": len(settings.ADMIN_PASSWORD),
            "admin_password_first_char": settings.ADMIN_PASSWORD[0] if settings.ADMIN_PASSWORD else "?",
            "admin_user_exists_in_db": user_exists,
            "total_users_in_db": user_count,
            "all_usernames": all_usernames,
        }
    }

def get_system():
    return system_service.get_system_metrics()

def get_system_logs(limit: int = 50):
    log_files = [f for f in os.listdir(LOGS_DIR) if f.endswith(".log")]
    if not log_files:
        return {"logs": ["No logs recorded yet."]}
    
    latest_file = sorted(log_files)[-1]
    full_path = os.path.join(LOGS_DIR, latest_file)
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            return {"file": latest_file, "logs": [line.strip() for line in lines[-limit:]]}
    except Exception as e:
        return {"file": latest_file, "logs": [f"Error reading logs: {str(e)}"]}

async def list_models():
    models = await ollama_service.list_models()
    return {"models": models}
