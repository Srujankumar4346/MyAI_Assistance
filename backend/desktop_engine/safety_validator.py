import os
from typing import Tuple


class SafetyValidator:
    """
    Validates filesystem, terminal, and system-control actions before execution.
    No action bypasses this.
    """

    FORBIDDEN_PATHS = [
        "C:\\Windows",
        "C:\\Program Files",
        "C:\\Program Files (x86)",
    ]

    DANGEROUS_COMMANDS = [
        "del /s",
        "rmdir /s",
        "format",
        "diskpart",
        "shutdown",
        "restart",
        "reg",
        "icacls",
    ]

    def validate_filesystem(self, path: str, action: str) -> Tuple[bool, str]:
        """Validates filesystem operations."""
        abs_path = os.path.abspath(path)

        # Prevent accessing system folders
        for forbidden in self.FORBIDDEN_PATHS:
            if abs_path.startswith(forbidden):
                return False, f"Access to protected system path '{forbidden}' is denied."

        # Prevent deletion of critical user folders
        if action in ["delete", "move"]:
            if abs_path == os.path.expanduser("~"):
                return False, "Cannot delete or move the user home directory."

        return True, "Safe"

    def validate_terminal(self, command: str) -> Tuple[bool, str]:
        """Validates terminal commands to prevent catastrophic operations."""
        lower_cmd = command.lower()
        for dangerous in self.DANGEROUS_COMMANDS:
            if dangerous in lower_cmd:
                return False, f"Command contains forbidden destructive keyword: '{dangerous}'"
        return True, "Safe"

    def validate_system(self, action: str, params: dict) -> Tuple[bool, str]:
        """Validates system controls like volume, brightness."""
        # Mostly safe, but validate range limits
        if action == "volume":
            vol = params.get("level", 0)
            if not (0 <= vol <= 100):
                return False, "Volume must be between 0 and 100"
        return True, "Safe"


safety_validator = SafetyValidator()
