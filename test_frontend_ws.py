import asyncio
import time
import json
from backend.browser_engine.events import event_bus
from backend.routers.browser_websocket import manager as ws_manager

class MockWebSocket:
    def __init__(self):
        self.messages = []
        
    async def send_text(self, text: str):
        self.messages.append(text)

async def run_ws_validation():
    print("Starting End-to-End WebSocket Flow Validation...")
    
    mock_ws = MockWebSocket()
    ws_manager.active_connections.append(mock_ws)
    ws_manager.subscriptions[mock_ws] = ["browser.session", "browser.tabs", "browser.downloads", "browser.health"]
    
    # 1. Test Session Creation
    event_bus.publish("SESSION_CREATED", {"session_id": "test_sess_1", "workspace": "Development"})
    await asyncio.sleep(0.1)  # Allow async tasks to fire
    
    # 2. Test Tab Opened
    event_bus.publish("TAB_OPENED", {"session_id": "test_sess_1", "tab_id": "tab_1", "url": "https://react.dev"})
    await asyncio.sleep(0.1)
    
    # 3. Test Download Progress (High Frequency)
    start_time = time.time()
    for i in range(100):
        event_bus.publish("DOWNLOAD_PROGRESS", {"id": "dl_1", "progress": i, "transferSpeed": f"{i} MB/s"})
    await asyncio.sleep(0.5)
    end_time = time.time()
    
    # Analyze Results
    print(f"Total messages received by client: {len(mock_ws.messages)}")
    print(f"Time to process 100 high-frequency download events: {end_time - start_time:.4f} seconds")
    
    if len(mock_ws.messages) > 0:
        sample = json.loads(mock_ws.messages[0])
        print("Validated Standard Schema:", all(k in sample for k in ("event_id", "timestamp", "channel", "event_type", "payload")))
        print("Schema Sample:", json.dumps(sample, indent=2))
        
    ws_manager.active_connections.remove(mock_ws)
    print("Validation Complete.")

if __name__ == "__main__":
    asyncio.run(run_ws_validation())
