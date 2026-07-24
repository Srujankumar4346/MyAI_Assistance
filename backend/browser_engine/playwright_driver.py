
from playwright.async_api import Browser, BrowserContext, Page, async_playwright

from backend.browser_engine.driver import BrowserDriver
from backend.utils.logger import logger


class PlaywrightDriver(BrowserDriver):
    def __init__(self):
        self.playwright = None
        self.browser: Browser | None = None
        self.contexts: dict[str, BrowserContext] = {}
        self.pages: dict[str, Page] = {}
        self.logger = logger
        self.is_initialized = False

    async def initialize(self, headless: bool = False):
        if self.is_initialized:
            return

        self.logger.info("Initializing PlaywrightDriver...")
        self.playwright = await async_playwright().start()
        # Launch Chromium by default. Can be extended to Firefox/WebKit.
        self.browser = await self.playwright.chromium.launch(headless=headless)
        self.is_initialized = True
        self.logger.info("PlaywrightDriver successfully initialized.")

    async def shutdown(self):
        self.logger.info("Shutting down PlaywrightDriver...")
        for context in self.contexts.values():
            await context.close()

        if self.browser:
            await self.browser.close()

        if self.playwright:
            await self.playwright.stop()

        self.is_initialized = False
        self.logger.info("PlaywrightDriver shutdown complete.")

    def get_capabilities(self):
        return ["tabs", "sessions", "downloads", "cookies", "screenshots"]

    async def create_context(self, workspace_id: str) -> str:
        if not self.browser:
            raise RuntimeError("Driver not initialized")

        # Contexts isolate cookies, local storage, etc. per workspace
        context = await self.browser.new_context(accept_downloads=True, ignore_https_errors=True)
        self.contexts[workspace_id] = context
        self.logger.debug(f"Created browser context for workspace: {workspace_id}")
        return workspace_id

    async def destroy_context(self, context_id: str):
        if context_id in self.contexts:
            await self.contexts[context_id].close()
            del self.contexts[context_id]

    async def open_tab(self, context_id: str, url: str) -> str:
        if context_id not in self.contexts:
            raise ValueError(f"Context {context_id} does not exist.")

        context = self.contexts[context_id]
        page = await context.new_page()

        # Generate a unique tab ID
        import uuid

        tab_id = str(uuid.uuid4())
        self.pages[tab_id] = page

        if url:
            await page.goto(url)

        self.logger.debug(f"Opened tab {tab_id} in context {context_id}")
        return tab_id

    async def close_tab(self, tab_id: str):
        if tab_id in self.pages:
            await self.pages[tab_id].close()
            del self.pages[tab_id]
            self.logger.debug(f"Closed tab {tab_id}")

    async def focus_tab(self, tab_id: str):
        if tab_id in self.pages:
            await self.pages[tab_id].bring_to_front()
            self.logger.debug(f"Focused tab {tab_id}")
        else:
            raise ValueError(f"Tab {tab_id} does not exist.")

    async def duplicate_tab(self, tab_id: str) -> str:
        if tab_id not in self.pages:
            raise ValueError(f"Tab {tab_id} does not exist.")
        page = self.pages[tab_id]
        context = page.context
        new_page = await context.new_page()
        current_url = page.url
        
        import uuid
        new_tab_id = str(uuid.uuid4())
        self.pages[new_tab_id] = new_page
        
        if current_url and current_url != "about:blank":
            await new_page.goto(current_url)
            
        self.logger.debug(f"Duplicated tab {tab_id} to {new_tab_id}")
        return new_tab_id

    async def reload_tab(self, tab_id: str):
        if tab_id in self.pages:
            await self.pages[tab_id].reload()
            self.logger.debug(f"Reloaded tab {tab_id}")
        else:
            raise ValueError(f"Tab {tab_id} does not exist.")
