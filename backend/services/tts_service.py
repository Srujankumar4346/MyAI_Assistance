"""
TTS Service — Text-to-Speech using edge-tts (Microsoft Neural voices).
Falls back gracefully if edge-tts is unavailable.
"""
import asyncio
import io
from typing import AsyncGenerator, Optional
from backend.utils.logger import logger

# Available voices (subset of edge-tts voices)
AVAILABLE_VOICES = [
    {"id": "en-US-AriaNeural",    "name": "Aria (US Female)",    "lang": "en-US"},
    {"id": "en-US-GuyNeural",     "name": "Guy (US Male)",       "lang": "en-US"},
    {"id": "en-US-JennyNeural",   "name": "Jenny (US Female)",   "lang": "en-US"},
    {"id": "en-GB-SoniaNeural",   "name": "Sonia (UK Female)",   "lang": "en-GB"},
    {"id": "en-GB-RyanNeural",    "name": "Ryan (UK Male)",      "lang": "en-GB"},
    {"id": "en-AU-NatashaNeural", "name": "Natasha (AU Female)", "lang": "en-AU"},
    {"id": "en-IN-NeerjaNeural",  "name": "Neerja (IN Female)",  "lang": "en-IN"},
]


async def synthesize_speech(
    text: str,
    voice: str = "en-US-AriaNeural",
    rate: str = "+0%",
    pitch: str = "+0Hz",
    volume: str = "+0%",
) -> Optional[bytes]:
    """
    Convert text to speech using edge-tts.
    Returns MP3 audio bytes, or None if synthesis fails.
    """
    if not text or not text.strip():
        return None
    try:
        import edge_tts
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, volume=volume)
        audio_buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_buffer.write(chunk["data"])
        audio_bytes = audio_buffer.getvalue()
        if audio_bytes:
            return audio_bytes
        return None
    except ImportError:
        logger.warning("edge-tts not installed. TTS synthesis skipped.")
        return None
    except Exception as e:
        logger.error(f"TTS synthesis error: {e}")
        return None


async def synthesize_speech_stream(
    text: str,
    voice: str = "en-US-AriaNeural",
    rate: str = "+0%",
    pitch: str = "+0Hz",
) -> AsyncGenerator[bytes, None]:
    """
    Stream audio chunks from edge-tts for lower latency.
    Yields MP3 audio chunk bytes.
    """
    if not text or not text.strip():
        return
    try:
        import edge_tts
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]
    except ImportError:
        logger.warning("edge-tts not installed. TTS streaming skipped.")
    except Exception as e:
        logger.error(f"TTS streaming error: {e}")


def speed_to_rate(speed: float) -> str:
    """Convert speed multiplier (0.5–2.0) to edge-tts rate string."""
    pct = int((speed - 1.0) * 100)
    return f"+{pct}%" if pct >= 0 else f"{pct}%"


def pitch_to_hz(pitch: float) -> str:
    """Convert pitch multiplier (0.5–2.0) to edge-tts pitch string."""
    hz = int((pitch - 1.0) * 50)
    return f"+{hz}Hz" if hz >= 0 else f"{hz}Hz"


def get_available_voices():
    return AVAILABLE_VOICES
