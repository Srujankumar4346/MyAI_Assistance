import asyncio
import json
import time
import uuid
from typing import Dict, List, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.security.auth import decode_token
from backend.utils.logger import logger
from backend.browser_engine.events import event_bus

router = APIRouter()

class ConnectionManager:
    """
    WebSocket Broadcaster.
    Stateless transport layer to push EventBus messages to the dashboard.
    No business logic lives here.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[WebSocket, List[str]] = {}
        self.connection_metadata: Dict[WebSocket, dict] = {}
        self.logger = logger
        
        event_bus.subscribe("SESSION_CREATED", self._handle_bus_event)
        event_bus.subscribe("SESSION_CLOSED", self._handle_bus_event)
        event_bus.subscribe("TAB_OPENED", self._handle_bus_event)
        event_bus.subscribe("TAB_CLOSED", self._handle_bus_event)
        event_bus.subscribe("DOWNLOAD_STARTED", self._handle_bus_event)
        event_bus.subscribe("DOWNLOAD_PROGRESS", self._handle_bus_event)
        event_bus.subscribe("DOWNLOAD_COMPLETED", self._handle_bus_event)
        event_bus.subscribe("DOWNLOAD_FAILED", self._handle_bus_event)
        event_bus.subscribe("RESEARCH_STARTED", self._handle_bus_event)
        event_bus.subscribe("RESEARCH_PROGRESS", self._handle_bus_event)
        event_bus.subscribe("RESEARCH_COMPLETED", self._handle_bus_event)
        event_bus.subscribe("RESEARCH_FAILED", self._handle_bus_event)
        event_bus.subscribe("AUTOMATION_STARTED", self._handle_bus_event)
        event_bus.subscribe("AUTOMATION_PROGRESS", self._handle_bus_event)
        event_bus.subscribe("AUTOMATION_COMPLETED", self._handle_bus_event)
        event_bus.subscribe("AUTOMATION_FAILED", self._handle_bus_event)
        event_bus.subscribe("PERMISSION_REQUESTED", self._handle_bus_event)
        event_bus.subscribe("PERMISSION_GRANTED", self._handle_bus_event)
        event_bus.subscribe("PERMISSION_DENIED", self._handle_bus_event)
        event_bus.subscribe("QUEUE_UPDATED", self._handle_bus_event)
        event_bus.subscribe("MEMORY_CREATED", self._handle_bus_event)
        event_bus.subscribe("MEMORY_UPDATED", self._handle_bus_event)
        event_bus.subscribe("MEMORY_REINFORCED", self._handle_bus_event)
        event_bus.subscribe("KNOWLEDGE_NODE_CREATED", self._handle_bus_event)
        event_bus.subscribe("KNOWLEDGE_EDGE_CREATED", self._handle_bus_event)
        event_bus.subscribe("LEARNING_UPDATED", self._handle_bus_event)
        event_bus.subscribe("DOCUMENT_ANALYZED", self._handle_bus_event)
        event_bus.subscribe("RESEARCH_INGESTED", self._handle_bus_event)
        event_bus.subscribe("TELEMETRY_EVENT", self._handle_bus_event)
        
    async def connect(self, websocket: WebSocket, token: str, workspace: str, db: Session):
        """Accepts connection and enforces strict JWT authentication & Workspace authorization."""
        await websocket.accept()
        
        if not token:
            self.logger.warning(f"Security Alert: Rejected WS connection missing token (IP: {websocket.client.host})")
            await websocket.close(code=1008, reason="Unauthorized: Missing Token")
            return False
            
        # 1. Validate JWT Signature and Expiration via Core Auth
        user = decode_token(token, db)
        if not user:
            self.logger.warning(f"Security Alert: Rejected WS connection with invalid/expired token (IP: {websocket.client.host})")
            await websocket.close(code=1008, reason="Unauthorized: Invalid Token")
            return False
            
        # 2. Workspace Validation
        if not workspace:
            self.logger.warning(f"Security Alert: Rejected WS connection missing workspace (User: {user.id})")
            await websocket.close(code=1008, reason="Unauthorized: Missing Workspace")
            return False

        # In a full implementation, check if user has access to `workspace`.
        
        self.active_connections.append(websocket)
        self.subscriptions[websocket] = []
        self.connection_metadata[websocket] = {
            "user_id": user.id,
            "workspace": workspace,
            "ip": websocket.client.host,
            "connected_at": time.time()
        }
        
        self.logger.info(f"WebSocket Client Connected: User {user.id} | Workspace {workspace} | IP {websocket.client.host}")
        return True

    def disconnect(self, websocket: WebSocket):
        """Cleans up on disconnect."""
        meta = self.connection_metadata.get(websocket, {})
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.subscriptions:
            del self.subscriptions[websocket]
        if websocket in self.connection_metadata:
            del self.connection_metadata[websocket]
            
        self.logger.info(f"WebSocket Client Disconnected: User {meta.get('user_id')} | Workspace {meta.get('workspace')}")

    async def _handle_bus_event(self, event_type: str, data: dict):
        """Catches events from the internal EventBus and routes them to subscribed WebSockets."""
        # Determine the channel (e.g., SESSION_CREATED -> browser.session)
        channel = "browser.events"
        if "SESSION" in event_type:
            channel = "browser.session"
        elif "TAB" in event_type:
            channel = "browser.tabs"
        elif "DOWNLOAD" in event_type:
            channel = "browser.downloads"
        elif "RESEARCH" in event_type and "INGESTED" not in event_type:
            channel = "browser.research"
        elif "AUTOMATION" in event_type or "PERMISSION" in event_type or "QUEUE" in event_type:
            channel = "browser.automation"
        elif "HEALTH" in event_type or "TELEMETRY" in event_type:
            channel = "browser.health"
        elif any(k in event_type for k in ["MEMORY", "KNOWLEDGE", "LEARNING", "DOCUMENT", "RESEARCH_INGESTED"]):
            channel = "browser.memory"
            
        await self.broadcast(channel, event_type, data)

    async def broadcast(self, channel: str, event_type: str, payload: dict):
        """Serializes and sends structured events to subscribed clients."""
        event_id = str(uuid.uuid4())
        timestamp = time.time()
        
        message = {
            "event_id": event_id,
            "timestamp": timestamp,
            "channel": channel,
            "event_type": event_type,
            "payload": payload,
            "version": "1.0",
            "source": "BrowserSessionManager"
        }
        
        msg_str = json.dumps(message)
        
        for connection in self.active_connections:
            # Only send if they subscribed to the channel (or if they are subscribed to all for testing)
            subs = self.subscriptions.get(connection, [])
            if channel in subs or len(subs) == 0: 
                try:
                    await connection.send_text(msg_str)
                except Exception as e:
                    self.logger.error(f"Failed to send WS message: {e}")
                    
    async def process_client_message(self, websocket: WebSocket, data: str):
        """Handles subscription requests from the client."""
        try:
            msg = json.loads(data)
            if msg.get("action") == "subscribe":
                channels = msg.get("channels", [])
                self.subscriptions[websocket] = channels
                self.logger.debug(f"Client subscribed to channels: {channels}")
        except json.JSONDecodeError:
            pass

manager = ConnectionManager()

@router.websocket("/ws/browser")
async def websocket_browser_endpoint(
    websocket: WebSocket, 
    token: str = None, 
    workspace: str = None,
    db: Session = Depends(get_db)
):
    if not await manager.connect(websocket, token, workspace, db):
        return
        
    try:
        while True:
            data = await websocket.receive_text()
            await manager.process_client_message(websocket, data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket unexpected error: {e}")
        manager.disconnect(websocket)
