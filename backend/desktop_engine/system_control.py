import psutil
import ctypes
import os

class SystemControlEngine:
    """Gets metrics and sets volume, brightness."""
    
    def get_status(self):
        # Battery fallback
        battery_percent = None
        if hasattr(psutil, "sensors_battery"):
            bat = psutil.sensors_battery()
            if bat:
                battery_percent = bat.percent
                
        # Temperature fallback (usually only available on linux or via WMI on Windows as admin)
        temperature = None
        try:
            if hasattr(psutil, "sensors_temperatures"):
                temps = psutil.sensors_temperatures()
                if temps and 'coretemp' in temps:
                    temperature = temps['coretemp'][0].current
        except Exception:
            pass

        return {
            "cpu_percent": psutil.cpu_percent(interval=0.1),
            "ram_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent,
            "battery_percent": battery_percent,
            "temperature": temperature
        }

system_control_engine = SystemControlEngine()
