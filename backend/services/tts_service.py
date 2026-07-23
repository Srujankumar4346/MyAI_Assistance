"""
TTS Service — Text-to-Speech with automatic offline fallback.

Priority chain:
  1. edge-tts  (Microsoft Neural voices — requires internet)
  2. pyttsx3   (system TTS — fully offline, no internet required)
  3. Silent    (returns None — frontend uses Web Speech Synthesis API)
"""
import asyncio
import io
import os
from typing import AsyncGenerator, Optional
from backend.utils.logger import logger

# ── Available edge-tts voices (subset) ────────────────────────────────────────
AVAILABLE_VOICES = [
    {"id": "en-US-AriaNeural",    "name": "Aria (US Female)",    "lang": "en-US"},
    {"id": "en-US-GuyNeural",     "name": "Guy (US Male)",       "lang": "en-US"},
    {"id": "en-US-JennyNeural",   "name": "Jenny (US Female)",   "lang": "en-US"},
    {"id": "en-GB-SoniaNeural",   "name": "Sonia (UK Female)",   "lang": "en-GB"},
    {"id": "en-GB-RyanNeural",    "name": "Ryan (UK Male)",      "lang": "en-GB"},
    {"id": "en-AU-NatashaNeural", "name": "Natasha (AU Female)", "lang": "en-AU"},
    {"id": "en-IN-NeerjaNeural",  "name": "Neerja (IN Female)",  "lang": "en-IN"},
]

# Cache pyttsx3 availability so we don't attempt import every call
_pyttsx3_available: Optional[bool] = None


def _check_pyttsx3() -> bool:
    global _pyttsx3_available
    if _pyttsx3_available is not None:
        return _pyttsx3_available
    try:
        import pyttsx3  # noqa: F401
        _pyttsx3_available = True
    except Exception:
        _pyttsx3_available = False
    return _pyttsx3_available


async def _synthesize_pyttsx3(text: str) -> Optional[bytes]:
    """
    Synthesize speech using pyttsx3 (offline).
    Saves to a temp WAV file, reads it back, and returns raw bytes.
    Returns None if pyttsx3 is unavailable or fails.
    """
    if not _check_pyttsx3():
        return None

    import tempfile

    tmp_path = tempfile.mktemp(suffix=".wav")
    try:
        def _run():
            import pyttsx3
            engine = pyttsx3.init()
            engine.setProperty("rate", 175)
            engine.save_to_file(text, tmp_path)
            engine.runAndWait()

        # pyttsx3 is synchronous — run in a thread so we don't block the event loop
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _run)

        if os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0:
            with open(tmp_path, "rb") as f:
                return f.read()
        return None
    except Exception as e:
        logger.error(f"[TTS] pyttsx3 synthesis error: {e}")
        return None
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


async def synthesize_speech(
    text: str,
    voice: str = "en-US-AriaNeural",
    rate: str = "+0%",
    pitch: str = "+0Hz",
    volume: str = "+0%",
) -> Optional[bytes]:
    """
    Convert text to speech.
    Returns audio bytes (MP3 or WAV), or None if all engines fail.

    Priority: edge-tts → pyttsx3 → None (frontend browser TTS fallback)
    """
    if not text or not text.strip():
        return None

    # ── 1. Try edge-tts (internet-based, high quality) ────────────────────────
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
    except ImportError:
        logger.debug("[TTS] edge-tts not installed, skipping.")
    except Exception as e:
        logger.warning(f"[TTS] edge-tts failed ({e}), trying pyttsx3 offline fallback.")

    # ── 2. pyttsx3 offline fallback ───────────────────────────────────────────
    try:
        audio_bytes = await _synthesize_pyttsx3(text)
        if audio_bytes:
            logger.info("[TTS] Using pyttsx3 offline fallback.")
            return audio_bytes
    except Exception as e:
        logger.warning(f"[TTS] pyttsx3 failed: {e}")

    # ── 3. Silent fallback — frontend will use Web Speech Synthesis API ───────
    logger.warning("[TTS] All TTS engines failed. Returning None — browser TTS will be used.")
    return None


async def synthesize_speech_stream(
    text: str,
    voice: str = "en-US-AriaNeural",
    rate: str = "+0%",
    pitch: str = "+0Hz",
) -> AsyncGenerator[bytes, None]:
    """
    Stream audio chunks for lower latency (edge-tts only).
    Falls back to a single chunk from pyttsx3 if edge-tts unavailable.
    """
    if not text or not text.strip():
        return

    # Try edge-tts streaming first
    try:
        import edge_tts
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]
        return
    except ImportError:
        pass
    except Exception as e:
        logger.warning(f"[TTS] edge-tts stream failed: {e}")

    # Fall back to single-chunk pyttsx3
    try:
        audio_bytes = await _synthesize_pyttsx3(text)
        if audio_bytes:
            yield audio_bytes
    except Exception as e:
        logger.warning(f"[TTS] pyttsx3 stream fallback failed: {e}")


# ── Conversion helpers ─────────────────────────────────────────────────────────

def speed_to_rate(speed: float) -> str:
    """Convert speed multiplier (0.5–2.0) → edge-tts rate string, e.g. '+20%'."""
    pct = int((speed - 1.0) * 100)
    return f"+{pct}%" if pct >= 0 else f"{pct}%"


def pitch_to_hz(pitch: float) -> str:
    """Convert pitch multiplier (0.5–2.0) → edge-tts pitch string, e.g. '+10Hz'."""
    hz = int((pitch - 1.0) * 50)
    return f"+{hz}Hz" if hz >= 0 else f"{hz}Hz"


def get_available_voices():
    return AVAILABLE_VOICES
