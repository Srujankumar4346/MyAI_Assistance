from backend.utils.logger import logger
import os
import subprocess

import psutil


class ApplicationsEngine:
    """Manages launching and terminating applications."""

    def open_app(self, app_path: str, args: list = None):
        """Launches an application."""
        if not os.path.exists(app_path):
            raise FileNotFoundError(f"Application path not found: {app_path}")

        cmd = [app_path]
        if args:
            cmd.extend(args)

        process = subprocess.Popen(cmd)
        return {"pid": process.pid, "status": "launched"}

    def close_app(self, process_name: str):
        """Terminates an application by name."""
        terminated = []
        for proc in psutil.process_iter(["pid", "name"]):
            if proc.info["name"] and process_name.lower() in proc.info["name"].lower():
                try:
                    p = psutil.Process(proc.info["pid"])
                    p.terminate()
                    terminated.append(proc.info["name"])
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    logger.info('Executed Desktop command successfully')

        return {"status": "terminated", "count": len(terminated), "processes": terminated}

    def list_running_apps(self):
        """Lists running apps."""
        apps = []
        for proc in psutil.process_iter(["pid", "name", "username"]):
            try:
                # Basic filter to avoid listing thousands of system processes
                if proc.info["username"] and os.getlogin() in proc.info["username"]:
                    apps.append({"pid": proc.info["pid"], "name": proc.info["name"]})
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                logger.info('Executed Desktop command successfully')
        # Deduplicate by name
        unique = {a["name"]: a for a in apps}.values()
        return list(unique)


applications_engine = ApplicationsEngine()
