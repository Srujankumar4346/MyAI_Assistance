import json
import os
import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from backend.browser_engine.models import Download
from backend.utils.logger import log_telemetry, logger


class DownloadManager:
    def __init__(self):
        self.logger = logger
        self.download_dir = os.path.join(os.getcwd(), "downloads")
        os.makedirs(self.download_dir, exist_ok=True)

    async def handle_download(self, db: Session, user_id: int, download_obj) -> str:
        """
        Takes a Playwright Download object, saves it, extracts metadata,
        and automatically creates a Memory entry.
        """
        download_id = str(uuid.uuid4())
        suggested_filename = download_obj.suggested_filename
        url = download_obj.url
        local_path = os.path.join(self.download_dir, f"{download_id}_{suggested_filename}")

        # Determine file type
        file_ext = (
            suggested_filename.split(".")[-1].lower() if "." in suggested_filename else "unknown"
        )

        # Save file to disk
        await download_obj.save_as(local_path)

        # Metadata extraction
        metadata = {
            "filename": suggested_filename,
            "source_url": url,
            "file_size": os.path.getsize(local_path),
            "type": file_ext,
        }

        # Store in DB
        db_download = Download(
            id=download_id,
            user_id=user_id,
            url=url,
            local_path=local_path,
            file_type=file_ext,
            status="completed",
            metadata_json=json.dumps(metadata),
            created_at=datetime.utcnow(),
        )
        db.add(db_download)
        db.commit()

        self.logger.info(f"Download completed: {suggested_filename}")

        # Telemetry
        log_telemetry(
            "download_completed", {"file_type": file_ext, "file_size": metadata["file_size"]}
        )

        # Automatically trigger Memory integration (Memory Engine ingestion)
        await self._trigger_memory_ingestion(db, user_id, db_download)

        return download_id

    async def _trigger_memory_ingestion(self, db: Session, user_id: int, download: Download):
        """Passes the downloaded file to the Document Intelligence engine."""
        # For MVP, we log the intent. In a full system, this calls memory_engine's ingestion.
        self.logger.info(f"Triggering Neural Memory ingestion for {download.local_path}")
        # from backend.memory_engine.ingestion import ingest_file
        # await ingest_file(db, user_id, download.local_path, context=f"Downloaded from {download.url}")


download_manager = DownloadManager()
