from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BrowserDriver(ABC):
    """
    Abstract interface for browser automation.
    Decouples the BrowserSessionManager from specific tools like Playwright.
    """
    
    @abstractmethod
    async def initialize(self):
        """Initializes the driver."""
        pass
        
    @abstractmethod
    async def shutdown(self):
        """Safely tears down the driver."""
        pass
        
    @abstractmethod
    def get_capabilities(self) -> List[str]:
        """
        Returns supported capabilities.
        Example: ['tabs', 'downloads', 'cookies', 'screenshots']
        """
        pass
        
    @abstractmethod
    async def create_context(self, workspace_id: str) -> str:
        """Creates an isolated browser context."""
        pass

    @abstractmethod
    async def open_tab(self, context_id: str, url: str) -> str:
        """Opens a new tab and returns the tab ID."""
        pass
        
    @abstractmethod
    async def close_tab(self, tab_id: str):
        """Closes a specific tab."""
        pass
