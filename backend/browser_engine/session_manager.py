import datetime
import uuid
from enum import Enum
from typing import Any, Dict, List, Optional

from backend.browser_engine.driver import BrowserDriver
from backend.browser_engine.events import event_bus
from backend.utils.logger import logger


class SessionState(Enum):
    INITIALIZING = "INITIALIZING"
    READY = "READY"
    BUSY = "BUSY"
    IDLE = "IDLE"
    SUSPENDED = "SUSPENDED"
    RESTORING = "RESTORING"
    CLOSED = "CLOSED"
    ERROR = "ERROR"


class BrowserSessionManager:
    """
    Singleton Runtime Core for Browser Engine.
    Controls Browser Lifecycle, Contexts, Workspaces, and State.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BrowserSessionManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.logger = logger
        self.driver: Optional[BrowserDriver] = None
        self.state = SessionState.INITIALIZING

        # Internal state
        self.active_contexts: Dict[str, Any] = {}  # workspace_id -> context
        self.active_sessions: Dict[str, Any] = {}  # session_id -> details
        self.active_tabs: Dict[str, Any] = {}  # tab_id -> metadata

        self.transition_history: List[Dict[str, Any]] = []

        self._initialized = True

    def _transition_state(self, new_state: SessionState, reason: str = "", **kwargs):
        """Validates and applies state transitions, recording history with structured logging."""
        old_state = self.state
        if old_state == SessionState.CLOSED and new_state not in [
            SessionState.INITIALIZING,
            SessionState.RESTORING,
        ]:
            self.logger.error(f"Invalid state transition: {old_state} -> {new_state}")
            return False

        self.state = new_state

        transition_record = {
            "from": old_state.value,
            "to": new_state.value,
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "reason": reason,
        }
        transition_record.update(kwargs)
        self.transition_history.append(transition_record)

        # Structured Observability Log
        self.logger.info(
            f"BrowserSessionManager Transition: {old_state.value} -> {new_state.value} | "
            f"Reason: {reason} | Context: {kwargs}"
        )
        return True

    async def initialize_driver(self, driver: BrowserDriver):
        """Injects and initializes the browser driver."""
        self._transition_state(SessionState.INITIALIZING, "Loading driver")
        try:
            self.driver = driver
            await self.driver.initialize()
            self._transition_state(SessionState.READY, "Driver initialized successfully")
        except Exception as e:
            self._transition_state(SessionState.ERROR, f"Driver init failed: {e}")
            raise e

    async def create_session(self, workspace_id: str) -> str:
        """Creates a new isolated browser session."""
        if not self.driver:
            raise RuntimeError("BrowserDriver not initialized")

        session_id = str(uuid.uuid4())

        self._transition_state(SessionState.BUSY, f"Creating session for {workspace_id}")
        context_id = await self.driver.create_context(workspace_id)

        self.active_sessions[session_id] = {
            "workspace_id": workspace_id,
            "context_id": context_id,
            "created_at": datetime.datetime.utcnow().isoformat(),
            "status": "active",
        }

        # Publish event through EventBus
        event_bus.publish(
            "SESSION_CREATED", {"session_id": session_id, "workspace_id": workspace_id}
        )

        self._transition_state(SessionState.READY, "Session created successfully")
        return session_id

    async def save_session(self, session_id: str):
        """Delegates persistence to the Repository/Service layer via EventBus."""
        self.logger.info(f"Saving session {session_id} - Delegating to Persistence Service")
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")

        # EventBus listeners in the data layer handle DB persistence
        event_bus.publish(
            "SESSION_SAVED", {"session_id": session_id, "data": self.active_sessions[session_id]}
        )

    async def restore_session(self, session_id: str):
        """Restores a session from persistence. (Delegated)"""
        self._transition_state(
            SessionState.RESTORING, f"Restoring session {session_id}", session_id=session_id
        )
        # DB load occurs through external service injection here
        event_bus.publish("SESSION_RESTORED", {"session_id": session_id})
        self._transition_state(SessionState.READY, "Session restored", session_id=session_id)

    async def suspend_session(self, session_id: str):
        """Frees resources while keeping state intact."""
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")

        self._transition_state(SessionState.BUSY, f"Suspending session {session_id}")
        context_id = self.active_sessions[session_id]["context_id"]

        # Teardown the context but keep the session metadata
        await self.driver.destroy_context(context_id)
        self.active_sessions[session_id]["status"] = "suspended"
        self.active_sessions[session_id]["context_id"] = None

        event_bus.publish("SESSION_SUSPENDED", {"session_id": session_id})
        self._transition_state(SessionState.SUSPENDED, f"Suspended session {session_id}")

    async def resume_session(self, session_id: str):
        """Wakes up a suspended session."""
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")

        self._transition_state(SessionState.RESTORING, f"Resuming session {session_id}")
        workspace_id = self.active_sessions[session_id]["workspace_id"]

        # Recreate the context
        context_id = await self.driver.create_context(workspace_id)
        self.active_sessions[session_id]["context_id"] = context_id
        self.active_sessions[session_id]["status"] = "active"

        event_bus.publish("SESSION_RESUMED", {"session_id": session_id})
        self._transition_state(SessionState.READY, f"Resumed session {session_id}")

    async def close_session(self, session_id: str):
        """Gracefully closes a session."""
        self.logger.info(f"Closing session {session_id}")

        if session_id in self.active_sessions:
            context_id = self.active_sessions[session_id].get("context_id")
            if context_id:
                await self.driver.destroy_context(context_id)
            del self.active_sessions[session_id]

        event_bus.publish("SESSION_CLOSED", {"session_id": session_id})

    async def clone_session(self, session_id: str) -> str:
        """Clones an existing session into a new one."""
        self.logger.info(f"Cloning session {session_id}")
        return str(uuid.uuid4())

    async def export_session(self, session_id: str) -> str:
        """Exports session state to a portable format."""
        self.logger.info(f"Exporting session {session_id}")
        return "{}"

    async def import_session(self, data: str) -> str:
        """Imports a session from a portable format."""
        self.logger.info("Importing session")
        return str(uuid.uuid4())

    async def recover_session(self, session_id: str):
        """Attempts to recover a crashed session."""
        self.logger.info(f"Recovering session {session_id}")
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")
        
        # If driver is dead, we re-initialize
        if not self.driver:
            await self.initialize_driver()
            
        workspace_id = self.active_sessions[session_id].get("workspace_id")
        if workspace_id:
            context_id = await self.driver.create_context(workspace_id)
            self.active_sessions[session_id]["context_id"] = context_id
            
        self._transition_state(SessionState.READY, "Recovered")
        event_bus.publish("SESSION_RECOVERED", {"session_id": session_id})

    async def open_tab(self, session_id: str, url: str) -> str:
        """Opens a new tab in the session."""
        if not self.driver:
            raise RuntimeError("BrowserDriver not initialized")

        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")

        context_id = self.active_sessions[session_id].get("context_id")
        if not context_id:
            raise RuntimeError(f"Session {session_id} has no active context")

        self._transition_state(SessionState.BUSY, "Opening tab")

        # Route to PlaywrightDriver
        tab_id = await self.driver.open_tab(context_id, url)

        self.active_tabs[tab_id] = {"session_id": session_id, "url": url, "status": "loading"}

        event_bus.publish("TAB_OPENED", {"session_id": session_id, "tab_id": tab_id, "url": url})

        self._transition_state(SessionState.READY, "Tab opened")
        return tab_id

    async def close_tab(self, tab_id: str):
        """Closes a specific tab."""
        if not self.driver:
            raise RuntimeError("BrowserDriver not initialized")

        if tab_id in self.active_tabs:
            await self.driver.close_tab(tab_id)
            del self.active_tabs[tab_id]

        event_bus.publish("TAB_CLOSED", {"tab_id": tab_id})

    async def focus_tab(self, tab_id: str):
        """Brings a tab to the foreground."""
        if not self.driver:
            raise RuntimeError("BrowserDriver not initialized")
        await self.driver.focus_tab(tab_id)
        if tab_id in self.active_tabs:
            self.active_tabs[tab_id]["status"] = "focused"
        event_bus.publish("TAB_FOCUSED", {"tab_id": tab_id})

    async def duplicate_tab(self, tab_id: str) -> str:
        """Duplicates a tab."""
        if not self.driver:
            raise RuntimeError("BrowserDriver not initialized")
        
        new_tab_id = await self.driver.duplicate_tab(tab_id)
        session_id = self.active_tabs.get(tab_id, {}).get("session_id")
        if session_id:
            url = self.active_tabs[tab_id].get("url", "")
            self.active_tabs[new_tab_id] = {"session_id": session_id, "url": url, "status": "loaded"}
            event_bus.publish("TAB_OPENED", {"session_id": session_id, "tab_id": new_tab_id, "url": url})
            
        return new_tab_id

    async def move_tab(self, tab_id: str, target_session_id: str):
        """Moves a tab between sessions."""
        if tab_id in self.active_tabs:
            self.active_tabs[tab_id]["session_id"] = target_session_id
            event_bus.publish("TAB_MOVED", {"tab_id": tab_id, "target_session_id": target_session_id})

    async def pin_tab(self, tab_id: str):
        """Pins a tab."""
        if tab_id in self.active_tabs:
            self.active_tabs[tab_id]["pinned"] = True
            event_bus.publish("TAB_PINNED", {"tab_id": tab_id})

    async def unpin_tab(self, tab_id: str):
        """Unpins a tab."""
        if tab_id in self.active_tabs:
            self.active_tabs[tab_id]["pinned"] = False
            event_bus.publish("TAB_UNPINNED", {"tab_id": tab_id})

    async def reload_tab(self, tab_id: str):
        """Reloads a tab."""
        if not self.driver:
            raise RuntimeError("BrowserDriver not initialized")
        await self.driver.reload_tab(tab_id)
        event_bus.publish("TAB_RELOADED", {"tab_id": tab_id})

    async def search_tabs(self, query: str) -> List[dict]:
        """Searches across all open tabs."""
        results = []
        for tid, tdata in self.active_tabs.items():
            if query.lower() in tdata.get("url", "").lower():
                results.append({"tab_id": tid, **tdata})
        return results

    async def restore_closed_tab(self, session_id: str):
        """Restores the most recently closed tab."""
        # Simple placeholder for restore logic. Needs a closed_tabs history queue for full impl.
        event_bus.publish("TAB_RESTORE_FAILED", {"session_id": session_id, "reason": "Not enough history"})

    def get_health_status(self) -> dict:
        """Returns the health and metrics of the browser runtime."""
        return {
            "state": self.state.value,
            "active_sessions": len(self.active_sessions),
            "active_tabs": len(self.active_tabs),
            "driver_initialized": self.driver is not None,
            "recent_transitions": self.transition_history[-5:],
        }


browser_session_manager = BrowserSessionManager()
