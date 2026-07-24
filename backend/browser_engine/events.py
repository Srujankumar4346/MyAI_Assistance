import asyncio
from typing import Callable, Dict, List, Any
from backend.utils.logger import logger

class EventBus:
    """
    Internal Pub/Sub Event Bus.
    Decouples browser events from downstream systems (Memory, Telemetry, etc.).
    Includes reliability layer (failure isolation).
    """
    def __init__(self):
        self.logger = logger
        self._subscribers: Dict[str, List[Callable]] = {}
        self._failed_events: List[Dict[str, Any]] = []

    def subscribe(self, event_type: str, callback: Callable):
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(callback)
        self.logger.debug(f"Subscribed to {event_type}")

    def publish(self, event_type: str, data: dict):
        """Fire-and-forget publish."""
        if event_type not in self._subscribers:
            return

        for callback in self._subscribers[event_type]:
            # Schedule execution independently to isolate failures
            asyncio.create_task(self._safe_execute(callback, event_type, data))

    async def _safe_execute(self, callback: Callable, event_type: str, data: dict):
        try:
            if asyncio.iscoroutinefunction(callback):
                await callback(event_type, data)
            else:
                callback(event_type, data)
        except Exception as e:
            self.logger.error(f"EventBus subscriber failed on {event_type}: {e}")
            self._failed_events.append({
                "event_type": event_type,
                "data": data,
                "error": str(e)
            })

event_bus = EventBus()
