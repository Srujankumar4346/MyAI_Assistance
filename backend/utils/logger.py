import logging
import os
import sys
from datetime import datetime

LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

log_filename = os.path.join(LOGS_DIR, f"novax_{datetime.now().strftime('%Y-%m-%d')}.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[
        logging.FileHandler(log_filename, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)

logger = logging.getLogger("NOVA_X")

TELEMETRY_LOG_FILE = os.path.join(LOGS_DIR, "telemetry.jsonl")


def log_telemetry(event_type: str, data: dict):
    """
    Logs local telemetry data (respecting privacy).
    Feeds into the Learning Engine.
    """
    import json

    try:
        payload = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "data": data,
        }
        with open(TELEMETRY_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(payload) + "\n")
    except Exception as e:
        logger.error(f"Failed to write telemetry: {e}")
