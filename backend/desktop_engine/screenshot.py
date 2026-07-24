import mss
import mss.tools
import os
import time

class ScreenshotEngine:
    def __init__(self):
        self.save_dir = os.path.join("database", "screenshots")
        os.makedirs(self.save_dir, exist_ok=True)
        
    def take_screenshot(self):
        filename = f"screenshot_{int(time.time())}.png"
        filepath = os.path.join(self.save_dir, filename)
        
        with mss.mss() as sct:
            sct.shot(output=filepath)
            
        return {"status": "success", "path": filepath}

screenshot_engine = ScreenshotEngine()
