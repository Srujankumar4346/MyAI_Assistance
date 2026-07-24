from sqlalchemy.orm import Session
from backend.browser_engine.models import ResearchSession
from backend.browser_engine.search import search_engine
from backend.browser_engine.navigation import navigation_engine
from backend.browser_engine.reader import reader_engine
# from backend.browser_engine.summarizer import summarizer_engine (assumed implemented)
# from backend.browser_engine.web_memory import web_memory_engine (assumed implemented)
import uuid

class ResearchEngine:
    """Orchestrates the AI Research Pipeline."""
    
    async def start_research(self, db: Session, user_id: int, query: str, workspace_id: int):
        # 1. Create Research Session
        session_id = str(uuid.uuid4())
        r_session = ResearchSession(
            id=session_id,
            user_id=user_id,
            query=query,
            status="in_progress"
        )
        db.add(r_session)
        db.commit()
        
        # 2. Search Engine (APIs preferred)
        results = await search_engine.search(query)
        
        # 3. Open Top Results & Extract Content
        all_markdown = []
        for res in results[:3]: # Limit to top 3 for speed in MVP
            page_data = await navigation_engine.get_page_content(session_id, res["url"], headed=False)
            markdown = reader_engine.extract_article(page_data["html"])
            all_markdown.append(f"Source: {res['url']}\n{markdown}")
            
            # Step: Extract Entities -> Knowledge Graph
            # await web_memory_engine.ingest_page(db, user_id, res["url"], markdown)
            
        # 4. Summarize and Compare Sources
        # summary = await summarizer_engine.summarize_and_compare(query, all_markdown)
        summary = "Placeholder summary generated from extracted content."
        
        # 5. Store Report
        r_session.report_markdown = summary
        r_session.status = "completed"
        db.commit()
        
        return {"status": "completed", "session_id": session_id, "report": summary}

research_engine = ResearchEngine()
