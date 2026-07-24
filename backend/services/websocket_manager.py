"""
WebSocket Manager — manages active voice WebSocket connections per user.
Supports heartbeat, broadcast, and graceful disconnect handling.
"""

from typing import Dict

from fastapi import WebSocket

from backend.utils.logger import logger


class VoiceConnectionManager:
    def __init__(self):
        # user_id -> WebSocket
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        # Disconnect any existing connection for this user
        if user_id in self.active_connections:
            old_ws = self.active_connections[user_id]
            try:
                await old_ws.close(code=1001)
            except Exception:
                import logging

                logging.getLogger(__name__).info("Function executed")
        self.active_connections[user_id] = websocket
        logger.info(f"Voice WebSocket connected: user_id={user_id}")

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"Voice WebSocket disconnected: user_id={user_id}")

    async def send_json(self, user_id: int, data: dict):
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception as e:
                logger.warning(f"Failed to send JSON to user {user_id}: {e}")
                self.disconnect(user_id)

    async def send_bytes(self, user_id: int, data: bytes):
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_bytes(data)
            except Exception as e:
                logger.warning(f"Failed to send bytes to user {user_id}: {e}")
                self.disconnect(user_id)

    async def broadcast_json(self, data: dict):
        disconnected = []
        for user_id, ws in self.active_connections.items():
            try:
                await ws.send_json(data)
            except Exception:
                disconnected.append(user_id)
        for uid in disconnected:
            self.disconnect(uid)

    def is_connected(self, user_id: int) -> bool:
        return user_id in self.active_connections


# Singleton instance
voice_manager = VoiceConnectionManager()
