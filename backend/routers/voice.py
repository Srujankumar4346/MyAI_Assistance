"""
Voice Router — REST + WebSocket endpoints for Phase 2 Voice AI.
"""

import base64
import re
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import User, VoiceSession
from backend.database.models import VoiceSettings as VoiceSettingsModel
from backend.security.auth import get_current_user
from backend.services.ollama_service import ollama_service
from backend.services.tts_service import (
    get_available_voices,
    pitch_to_hz,
    speed_to_rate,
    synthesize_speech,
)
from backend.services.websocket_manager import voice_manager
from backend.utils.logger import logger

router = APIRouter(prefix="/voice", tags=["Voice"])


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────


class VoiceSettingsSchema(BaseModel):
    voice_name: str = "en-US-AriaNeural"
    language: str = "en-US"
    speed: float = 1.0
    pitch: float = 1.0
    volume: float = 1.0
    continuous_mode: bool = False
    noise_reduction: bool = True
    auto_detect_silence: bool = True


class SpeakRequest(BaseModel):
    text: str
    voice: Optional[str] = "en-US-AriaNeural"
    speed: Optional[float] = 1.0
    pitch: Optional[float] = 1.0


class VoiceSessionSchema(BaseModel):
    id: str
    user_transcript: str
    ai_response: Optional[str]
    language: str
    confidence: float
    duration_ms: int
    model_used: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Helper ───────────────────────────────────────────────────────────────────


def get_or_create_voice_settings(db: Session, user_id: int) -> VoiceSettingsModel:
    vs = db.query(VoiceSettingsModel).filter(VoiceSettingsModel.user_id == user_id).first()
    if not vs:
        vs = VoiceSettingsModel(user_id=user_id)
        db.add(vs)
        db.commit()
        db.refresh(vs)
    return vs


# ─── REST Endpoints ───────────────────────────────────────────────────────────


@router.get("/voices")
def list_voices(current_user: User = Depends(get_current_user)):
    """Return available TTS voices."""
    return {"voices": get_available_voices()}


@router.get("/settings", response_model=VoiceSettingsSchema)
def get_voice_settings(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    vs = get_or_create_voice_settings(db, current_user.id)
    return vs


@router.post("/settings", response_model=VoiceSettingsSchema)
def update_voice_settings(
    payload: VoiceSettingsSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vs = get_or_create_voice_settings(db, current_user.id)
    vs.voice_name = payload.voice_name
    vs.language = payload.language
    vs.speed = max(0.5, min(2.0, payload.speed))
    vs.pitch = max(0.5, min(2.0, payload.pitch))
    vs.volume = max(0.0, min(1.0, payload.volume))
    vs.continuous_mode = payload.continuous_mode
    vs.noise_reduction = payload.noise_reduction
    vs.auto_detect_silence = payload.auto_detect_silence
    db.commit()
    db.refresh(vs)
    return vs


@router.post("/speak")
async def speak(payload: SpeakRequest, current_user: User = Depends(get_current_user)):
    """Convert text to speech. Returns MP3 audio as base64 JSON."""
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    rate = speed_to_rate(payload.speed or 1.0)
    pitch = pitch_to_hz(payload.pitch or 1.0)
    voice = payload.voice or "en-US-AriaNeural"

    audio_bytes = await synthesize_speech(payload.text, voice=voice, rate=rate, pitch=pitch)
    if audio_bytes:
        encoded = base64.b64encode(audio_bytes).decode("utf-8")
        return {"audio_base64": encoded, "mime_type": "audio/mpeg"}
    else:
        # Return empty response — client will fall back to browser TTS
        return {"audio_base64": None, "mime_type": None, "fallback": True}


@router.get("/history", response_model=List[VoiceSessionSchema])
def get_voice_history(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    sessions = (
        db.query(VoiceSession)
        .filter(VoiceSession.user_id == current_user.id)
        .order_by(VoiceSession.created_at.desc())
        .limit(50)
        .all()
    )
    return sessions


@router.delete("/history")
def clear_voice_history(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    db.query(VoiceSession).filter(VoiceSession.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Voice history cleared"}


# ─── WebSocket Endpoint ───────────────────────────────────────────────────────


@router.websocket("/ws")
async def voice_websocket(
    websocket: WebSocket,
    token: str,
    db: Session = Depends(get_db),
):
    """
    Real-time voice WebSocket.
    Client sends: { "type": "transcript", "text": "...", "model": "...", "confidence": 0.9, "language": "en-US" }
    Server sends:
      { "type": "thinking" }
      { "type": "text_chunk", "content": "..." }
      { "type": "audio_chunk", "data": "<base64 mp3>" }
      { "type": "done", "session_id": "..." }
      { "type": "error", "message": "..." }
      { "type": "pong" }
    """
    # Authenticate via token query param
    from backend.security.auth import decode_token

    user = decode_token(token, db)
    if not user:
        await websocket.close(code=4001)
        return

    await voice_manager.connect(websocket, user.id)

    # Load voice settings
    vs = get_or_create_voice_settings(db, user.id)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "transcript")

            # Heartbeat
            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if msg_type != "transcript":
                continue

            user_text = data.get("text", "").strip()
            model = data.get("model", "gemma")
            confidence = float(data.get("confidence", 0.0))
            language = data.get("language", "en-US")
            start_time = datetime.utcnow()

            if not user_text:
                continue

            # Signal thinking
            await websocket.send_json({"type": "thinking"})

            # Generate AI response (real-time streaming text + sentence-level real-time audio)
            messages = [{"role": "user", "content": user_text}]
            full_response = ""
            sentence_buffer = ""
            rate = speed_to_rate(vs.speed)
            pitch_str = pitch_to_hz(vs.pitch)

            try:
                async for chunk in ollama_service.generate_stream(messages, model=model):
                    full_response += chunk
                    sentence_buffer += chunk
                    # Stream text chunk immediately to frontend for real-time printing
                    await websocket.send_json({"type": "text_chunk", "content": chunk})

                    # Check for completed sentences to synthesize speech in real-time
                    while True:
                        match = re.search(r"([.!?\n])\s+", sentence_buffer)
                        if not match:
                            break
                        end_idx = match.end()
                        sentence = sentence_buffer[:end_idx].strip()
                        sentence_buffer = sentence_buffer[end_idx:]

                        if sentence:
                            try:
                                audio_bytes = await synthesize_speech(
                                    sentence, voice=vs.voice_name, rate=rate, pitch=pitch_str
                                )
                                if audio_bytes:
                                    encoded = base64.b64encode(audio_bytes).decode("utf-8")
                                    await websocket.send_json(
                                        {
                                            "type": "audio_chunk",
                                            "data": encoded,
                                            "mime": "audio/mpeg",
                                        }
                                    )
                            except Exception as e:
                                logger.warning(f"Sentence TTS error: {e}")

            except Exception as e:
                logger.error(f"Voice AI stream error: {e}")
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": "AI service unavailable. Ensure Ollama is running.",
                    }
                )
                continue

            # Synthesize speech for any remaining trailing text
            if sentence_buffer.strip():
                try:
                    audio_bytes = await synthesize_speech(
                        sentence_buffer.strip(), voice=vs.voice_name, rate=rate, pitch=pitch_str
                    )
                    if audio_bytes:
                        encoded = base64.b64encode(audio_bytes).decode("utf-8")
                        await websocket.send_json(
                            {"type": "audio_chunk", "data": encoded, "mime": "audio/mpeg"}
                        )
                except Exception as e:
                    logger.warning(f"Remaining TTS error: {e}")

            # Save session to database
            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            session_id = str(uuid.uuid4())
            session = VoiceSession(
                id=session_id,
                user_id=user.id,
                user_transcript=user_text,
                ai_response=full_response,
                language=language,
                confidence=confidence,
                duration_ms=duration_ms,
                model_used=model,
            )
            db.add(session)
            db.commit()

            await websocket.send_json({"type": "done", "session_id": session_id})

    except WebSocketDisconnect:
        voice_manager.disconnect(user.id)
    except Exception as e:
        logger.error(f"Voice WebSocket error: {e}")
        voice_manager.disconnect(user.id)
