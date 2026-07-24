import json
import os
from datetime import datetime, timezone

from cryptography.fernet import Fernet
from sqlalchemy.orm import Session

from backend.browser_engine.models import BrowserCookie
from backend.utils.logger import logger


class CookieManager:
    def __init__(self):
        self.logger = logger
        # Load or generate encryption key
        key_path = os.path.join(os.getcwd(), ".cookie_key")
        if os.path.exists(key_path):
            with open(key_path, "rb") as f:
                self.key = f.read()
        else:
            self.key = Fernet.generate_key()
            with open(key_path, "wb") as f:
                f.write(self.key)
        self.cipher = Fernet(self.key)

    def _encrypt(self, data: str) -> str:
        return self.cipher.encrypt(data.encode()).decode()

    def _decrypt(self, token: str) -> str:
        return self.cipher.decrypt(token.encode()).decode()

    def save_cookies(
        self, db: Session, workspace_id: int, user_id: int, domain: str, cookies: list
    ):
        """Encrypts and stores cookies."""
        # Filter expired cookies before saving
        now = datetime.now(timezone.utc).timestamp()
        valid_cookies = []
        for c in cookies:
            if c.get("expires", -1) != -1 and c.get("expires", -1) < now:
                continue
            valid_cookies.append(c)

        encrypted_data = self._encrypt(json.dumps(valid_cookies))

        # Check if domain already exists in workspace
        existing = (
            db.query(BrowserCookie)
            .filter_by(workspace_id=workspace_id, user_id=user_id, domain=domain)
            .first()
        )

        if existing:
            existing.encrypted_data = encrypted_data
            existing.created_at = datetime.utcnow()
        else:
            new_cookie = BrowserCookie(
                workspace_id=workspace_id,
                user_id=user_id,
                domain=domain,
                encrypted_data=encrypted_data,
            )
            db.add(new_cookie)

        db.commit()
        self.logger.info(f"Saved encrypted cookies for {domain} in workspace {workspace_id}")

    def load_cookies(self, db: Session, workspace_id: int, user_id: int, domain: str) -> list:
        """Loads and decrypts cookies, filtering expired ones."""
        record = (
            db.query(BrowserCookie)
            .filter_by(workspace_id=workspace_id, user_id=user_id, domain=domain)
            .first()
        )

        if not record:
            return []

        try:
            raw_data = self._decrypt(record.encrypted_data)
            cookies = json.loads(raw_data)
        except Exception as e:
            self.logger.error(f"Failed to decrypt cookies for {domain}: {e}")
            return []

        # Filter expired
        now = datetime.now(timezone.utc).timestamp()
        valid_cookies = [
            c for c in cookies if c.get("expires", -1) == -1 or c.get("expires", -1) >= now
        ]
        return valid_cookies

    def import_cookies(self, db: Session, workspace_id: int, user_id: int, raw_json: str):
        """Imports unencrypted cookies string to encrypted DB."""
        try:
            cookies = json.loads(raw_json)
            # Group by domain
            grouped = {}
            for c in cookies:
                domain = c.get("domain", "")
                if domain not in grouped:
                    grouped[domain] = []
                grouped[domain].append(c)

            for domain, domain_cookies in grouped.items():
                self.save_cookies(db, workspace_id, user_id, domain, domain_cookies)

            return True
        except Exception as e:
            self.logger.error(f"Failed to import cookies: {e}")
            return False

    def export_cookies(self, db: Session, workspace_id: int, user_id: int, domain: str) -> str:
        """Exports decrypted cookies to JSON string."""
        cookies = self.load_cookies(db, workspace_id, user_id, domain)
        return json.dumps(cookies, indent=2)


cookie_manager = CookieManager()
