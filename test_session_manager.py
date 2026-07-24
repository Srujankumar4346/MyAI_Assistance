import asyncio
import unittest
import uuid
from backend.browser_engine.session_manager import BrowserSessionManager, SessionState
from backend.browser_engine.driver import BrowserDriver

class MockDriver(BrowserDriver):
    def __init__(self):
        self.is_initialized = False
        self.tabs = {}
        
    async def initialize(self, headless=True):
        self.is_initialized = True
        
    async def shutdown(self):
        self.is_initialized = False

    async def create_context(self, workspace_id: str) -> str:
        return f"mock_ctx_{workspace_id}"

    async def destroy_context(self, context_id: str):
        pass

    async def open_tab(self, context_id: str, url: str) -> str:
        tab_id = str(uuid.uuid4())
        self.tabs[tab_id] = url
        return tab_id

    async def close_tab(self, tab_id: str):
        if tab_id in self.tabs:
            del self.tabs[tab_id]

    async def duplicate_tab(self, tab_id: str):
        return "mock_duplicated_tab"
        
    async def focus_tab(self, tab_id: str):
        pass
        
    async def reload_tab(self, tab_id: str):
        pass
        
    def get_capabilities(self):
        return ["tabs", "sessions"]
        pass

class TestBrowserSessionManager(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # Reset the singleton for testing
        BrowserSessionManager._instance = None
        self.manager = BrowserSessionManager()
        
    async def test_singleton(self):
        manager2 = BrowserSessionManager()
        self.assertIs(self.manager, manager2)
        
    async def test_state_machine_valid_transitions(self):
        self.assertEqual(self.manager.state, SessionState.INITIALIZING)
        
        # Test valid transitions
        self.assertTrue(self.manager._transition_state(SessionState.READY, "Driver Ready"))
        self.assertEqual(self.manager.state, SessionState.READY)
        
        self.assertTrue(self.manager._transition_state(SessionState.BUSY, "Processing"))
        self.assertEqual(self.manager.state, SessionState.BUSY)
        
        self.assertTrue(self.manager._transition_state(SessionState.IDLE, "Done Processing"))
        self.assertEqual(self.manager.state, SessionState.IDLE)
        
    async def test_state_machine_invalid_transitions(self):
        self.manager._transition_state(SessionState.CLOSED, "Shutting down")
        
        # CLOSED -> BUSY should be invalid
        self.assertFalse(self.manager._transition_state(SessionState.BUSY, "Invalid transition"))
        self.assertEqual(self.manager.state, SessionState.CLOSED)

    async def test_session_lifecycle(self):
        driver = MockDriver()
        await self.manager.initialize_driver(driver)
        
        session_id = await self.manager.create_session("dev_workspace")
        self.assertIn(session_id, self.manager.active_sessions)
        self.assertEqual(self.manager.active_sessions[session_id]["workspace_id"], "dev_workspace")
        
        await self.manager.suspend_session(session_id)
        self.assertEqual(self.manager.state, SessionState.SUSPENDED)
        
        await self.manager.resume_session(session_id)
        self.assertEqual(self.manager.state, SessionState.READY)
        
        await self.manager.close_session(session_id)
        self.assertNotIn(session_id, self.manager.active_sessions)

    async def test_tab_management(self):
        driver = MockDriver()
        await self.manager.initialize_driver(driver)
        
        session_id = await self.manager.create_session("research_workspace")
        tab_id = await self.manager.open_tab(session_id, "https://docs.pytest.org")
        
        self.assertIn(tab_id, self.manager.active_tabs)
        self.assertEqual(self.manager.active_tabs[tab_id]["url"], "https://docs.pytest.org")
        
        await self.manager.close_tab(tab_id)
        self.assertNotIn(tab_id, self.manager.active_tabs)

if __name__ == "__main__":
    unittest.main()
