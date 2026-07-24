
from backend.browser_engine.adapter import browser_adapter


class NavigationEngine:
    async def go_to(self, session_id: str, url: str, headed: bool = False):
        context = await browser_adapter.get_or_create_context(session_id, headed=headed)
        page = await context.new_page()
        await page.goto(url, wait_until="networkidle")
        title = await page.title()

        # We return a handle ID (index of pages, or just standard for MVP)
        # In a real app we'd map page UUIDs to Playwright Page objects.
        return {"status": "success", "url": page.url, "title": title}

    async def get_page_content(self, session_id: str, url: str, headed: bool = False):
        context = await browser_adapter.get_or_create_context(session_id, headed=headed)
        page = await context.new_page()
        await page.goto(url, wait_until="networkidle")
        content = await page.content()
        title = await page.title()
        await page.close()
        return {"title": title, "html": content}


navigation_engine = NavigationEngine()
