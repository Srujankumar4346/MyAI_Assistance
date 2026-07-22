import os
from backend.services.system_service import system_service
from backend.services.ollama_service import ollama_service
from backend.utils.logger import LOGS_DIR

def get_health():
    from backend.core.config import settings
    return {"status": "online", "app": settings.APP_NAME, "version": settings.VERSION}

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
