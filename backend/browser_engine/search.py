import httpx
from bs4 import BeautifulSoup
from backend.utils.logger import logger

class SearchEngine:
    """
    Search orchestration. Prefers APIs, falls back to basic scraping gracefully.
    """
    def __init__(self):
        # We would typically inject API keys here
        self.google_api_key = None
        
    async def search(self, query: str, engine: str = "duckduckgo"):
        """Returns top 5 search results."""
        if engine == "google" and self.google_api_key:
            return await self._google_api_search(query)
        else:
            # Fallback to DuckDuckGo HTML scraping
            return await self._ddg_scrape(query)

    async def _google_api_search(self, query: str):
        # Placeholder for actual Google Custom Search API
        pass
        
    async def _ddg_scrape(self, query: str):
        """Scrapes DuckDuckGo HTML version for safety & simplicity."""
        url = f"https://html.duckduckgo.com/html/?q={query}"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
            except Exception as e:
                logger.error(f"DDG Search failed: {e}")
                return []
                
        soup = BeautifulSoup(response.text, "lxml")
        results = []
        for a in soup.select("a.result__url"):
            link = a.get("href")
            if link and link.startswith("//duckduckgo.com/l/?"):
                # Real link is buried in url param, but DDG HTML also provides snippet
                continue
                
            # For simplicity, extract direct hrefs from result titles
        
        for a in soup.select("a.result__snippet"):
            results.append({
                "title": a.get_text()[:50] + "...",
                "url": a.get("href"),
                "snippet": a.get_text()
            })
            
        return results[:5]

search_engine = SearchEngine()
