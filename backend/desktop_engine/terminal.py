import subprocess
import os

class TerminalEngine:
    """Executes safe terminal commands."""
    
    def run_command(self, command: str, cwd: str = None):
        """Runs a command synchronously and captures output."""
        try:
            result = subprocess.run(
                command, 
                shell=True, 
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=30 # Prevent hanging
            )
            return {
                "status": "success",
                "output": result.stdout,
                "error": result.stderr,
                "exit_code": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {"status": "failed", "message": "Command timed out."}
        except Exception as e:
            return {"status": "failed", "error": str(e)}

terminal_engine = TerminalEngine()
