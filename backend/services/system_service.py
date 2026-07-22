import psutil
import platform
import datetime
from backend.core.config import settings

class SystemService:
    @staticmethod
    def get_system_metrics() -> dict:
        cpu_percent = psutil.cpu_percent(interval=None)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')

        return {
            "os": f"{platform.system()} {platform.release()}",
            "architecture": platform.machine(),
            "cpu_usage_percent": cpu_percent,
            "cpu_count": psutil.cpu_count(logical=True),
            "ram_total_gb": round(memory.total / (1024 ** 3), 2),
            "ram_used_gb": round(memory.used / (1024 ** 3), 2),
            "ram_usage_percent": memory.percent,
            "disk_total_gb": round(disk.total / (1024 ** 3), 2),
            "disk_used_gb": round(disk.used / (1024 ** 3), 2),
            "disk_usage_percent": disk.percent,
            "app_name": settings.APP_NAME,
            "app_version": settings.VERSION,
            "server_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

system_service = SystemService()
