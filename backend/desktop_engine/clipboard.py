import pyperclip


class ClipboardEngine:
    """Manages clipboard read/write safely."""

    def read(self):
        try:
            return {"content": pyperclip.paste(), "status": "success"}
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    def write(self, content: str):
        try:
            pyperclip.copy(content)
            return {"status": "success"}
        except Exception as e:
            return {"status": "failed", "error": str(e)}


clipboard_engine = ClipboardEngine()
