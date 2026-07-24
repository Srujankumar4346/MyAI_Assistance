import markdownify
from bs4 import BeautifulSoup


class ReaderEngine:
    """Extracts readable content from HTML."""

    def extract_article(self, html: str) -> str:
        """Converts HTML to clean Markdown for the LLM."""
        soup = BeautifulSoup(html, "lxml")

        # Remove noisy elements
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        # Try to find the main content block
        main_content = soup.find("main") or soup.find("article") or soup.find("body")
        if not main_content:
            return ""

        markdown = markdownify.markdownify(str(main_content), heading_style="ATX")
        return markdown.strip()


reader_engine = ReaderEngine()
