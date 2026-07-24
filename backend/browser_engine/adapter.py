from typing import Dict, Any, Optional
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from backend.utils.logger import logger
import asyncio

class BrowserAdapter:
    """
    Abstracts the underlying browser automation engine (currently Playwright).
    Allows swapping out Playwright for other drivers in the future without
    refactoring the entire Browser Engine.
    """
    def __init__(self):
        self.logger = logger
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._contexts: Dict[str, BrowserContext] = {}

    async def initialize(self):
        """Initializes the browser engine (Playwright)."""
        if not self._playwright:
            self._playwright = await async_playwright().start()
            # Chromium is default. Support headed/headless.
            self._browser = await self._playwright.chromium.launch(headless=True)
            self.logger.info("Browser Adapter initialized (Playwright).")

    async def get_or_create_context(self, session_id: str, headed: bool = False, persist_dir: str = None) -> BrowserContext:
        """
        Retrieves or creates an isolated browser context (session).
        If headed=True, it might require launching a new browser instance 
        specifically for headed mode (Playwright handles this by using launch_persistent_context 
        or a separate browser). For simplicity in MVP, we create a new context.
        """
        if not self._playwright:
            await self.initialize()

        if session_id in self._contexts:
            return self._contexts[session_id]

        # For MVP, we'll just create a new incognito context on the existing headless browser
        # If headed is required, we'd launch a new headed browser here.
        # To avoid blocking, we use the default headless browser unless specified.
        if headed:
            # Need a headed browser instance just for this context
            headed_browser = await self._playwright.chromium.launch(headless=False)
            context = await headed_browser.new_context()
        else:
            context = await self._browser.new_context()

        self._contexts[session_id] = context
        return context

    async def close_context(self, session_id: str):
        if session_id in self._contexts:
            await self._contexts[session_id].close()
            del self._contexts[session_id]

    async def teardown(self):
        """Closes the entire browser engine."""
        for ctx in self._contexts.values():
            await ctx.close()
        self._contexts.clear()
        
        if self._browser:
            await self._browser.close()
            self._browser = None
            
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None

browser_adapter = BrowserAdapter()
