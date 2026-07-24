"""
Ollama Service — AI inference with Gemini API cloud fallback.

Health monitoring:
  • Checks Ollama availability on first request.
  • Re-checks every 60 seconds in the background so the service automatically
    recovers when Ollama restarts or falls over mid-session.
  • Automatically switches to Gemini API when Ollama is unreachable.
  • Automatically restores Ollama when it comes back online.
"""

import asyncio
import json
import time
from typing import AsyncGenerator, Dict, List, Optional

import httpx

from backend.core.config import settings
from backend.utils.logger import logger

GEMINI_API_KEY: str = settings.GEMINI_API_KEY
GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
)

# ── System prompt ──────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = (
    "You are NOVA_X, a fast personal AI assistant. "
    "CRITICAL DIRECTIVE: Give VERY SHORT, direct, and concise answers (1 to 2 brief sentences maximum). "
    "Do NOT give long paragraphs, lists, or unnecessary details unless explicitly requested. "
    "Answer immediately and stay strictly to the point."
)


class OllamaService:
    def __init__(self, base_url: str = settings.OLLAMA_BASE_URL):
        self.base_url = base_url

        # Health state — None means "not checked yet"
        self._ollama_available: Optional[bool] = None
        self._last_check_ts: float = 0.0
        self._check_interval: float = 60.0  # seconds between background health checks
        self._check_lock = asyncio.Lock()

    # ── Health monitoring ──────────────────────────────────────────────────────

    async def _check_ollama(self, force: bool = False) -> bool:
        """
        Return True if Ollama is reachable.
        Results are cached for `_check_interval` seconds.
        Pass force=True to bypass the cache immediately.
        """
        async with self._check_lock:
            now = time.monotonic()
            if not force and self._ollama_available is not None:
                if now - self._last_check_ts < self._check_interval:
                    return self._ollama_available

            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    res = await client.get(f"{self.base_url}/api/tags")
                    available = res.status_code == 200
            except Exception:
                available = False

            # Log state transitions
            if self._ollama_available is None:
                logger.info(f"[OllamaService] Initial health check → available={available}")
            elif available != self._ollama_available:
                if available:
                    logger.info(
                        "[OllamaService] Ollama came BACK ONLINE — restoring local inference."
                    )
                else:
                    logger.warning(
                        "[OllamaService] Ollama went OFFLINE — switching to Gemini fallback."
                    )

            self._ollama_available = available
            self._last_check_ts = now
            return available

    async def list_models(self) -> List[str]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m["name"] for m in data.get("models", [])]
                    return models if models else ["gemma", "llama3", "qwen", "mistral"]
        except Exception as e:
            logger.warning(f"[OllamaService] list_models failed: {e}")
        return ["gemma", "llama3", "qwen", "mistral"]

    # ── Gemini cloud fallback ──────────────────────────────────────────────────

    async def _gemini_stream(
        self,
        messages: List[Dict[str, str]],
        system_content: str,
    ) -> AsyncGenerator[str, None]:
        """Stream responses from Google Gemini API (cloud fallback)."""
        if not GEMINI_API_KEY:
            yield (
                "AI service is offline. Ollama is not running and no GEMINI_API_KEY is configured. "
                "Please start Ollama locally or add GEMINI_API_KEY to your environment variables."
            )
            return

        contents: List[Dict] = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

        payload = {
            "system_instruction": {"parts": [{"text": system_content}]},
            "contents": contents,
            "generationConfig": {
                "maxOutputTokens": 150,
                "temperature": 0.6,
            },
        }

        url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}&alt=sse"
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code != 200:
                        body = await response.aread()
                        logger.error(f"[Gemini] HTTP {response.status_code}: {body[:200]}")
                        yield f"Gemini API error {response.status_code}. Check your API key."
                        return
                    async for line in response.aiter_lines():
                        if line.startswith("data:"):
                            raw = line[5:].strip()
                            if not raw or raw == "[DONE]":
                                continue
                            try:
                                data = json.loads(raw)
                                parts = (
                                    data.get("candidates", [{}])[0]
                                    .get("content", {})
                                    .get("parts", [])
                                )
                                for part in parts:
                                    text = part.get("text", "")
                                    if text:
                                        yield text
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
            logger.error(f"[Gemini] Streaming exception: {e}")
            yield f"Cloud AI error: {e}"

    # ── Ollama inference ───────────────────────────────────────────────────────

    async def _ollama_stream(
        self,
        messages: List[Dict[str, str]],
        model: str,
        system_content: str,
    ) -> AsyncGenerator[str, None]:
        """Stream responses directly from the local Ollama instance."""
        url = f"{self.base_url}/api/chat"
        installed = await self.list_models()

        # Model resolution / fallback
        if model not in installed and installed:
            matched: Optional[str] = None
            req_prefix = model.split(":")[0].lower()
            for m in installed:
                inst_prefix = m.split(":")[0].lower()
                if (
                    inst_prefix == req_prefix
                    or req_prefix in inst_prefix
                    or inst_prefix in req_prefix
                ):
                    matched = m
                    break
            if matched:
                model = matched
            else:
                general_keywords = ["llama", "qwen", "gemma", "mistral", "phi"]
                fallback: Optional[str] = None
                for kw in general_keywords:
                    for m in installed:
                        if kw in m.lower():
                            fallback = m
                            break
                    if fallback:
                        break
                model = fallback or installed[0]
                logger.info(f"[OllamaService] Falling back to model '{model}'.")

        payload = {
            "model": model,
            "messages": [{"role": "system", "content": system_content}] + messages,
            "stream": True,
            "options": {"num_predict": 100, "temperature": 0.6},
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code != 200:
                        logger.warning(
                            f"[OllamaService] HTTP {response.status_code} — falling back to Gemini."
                        )
                        # Force re-check next time
                        self._ollama_available = False
                        self._last_check_ts = 0.0
                        async for chunk in self._gemini_stream(messages, system_content):
                            yield chunk
                        return

                    async for line in response.aiter_lines():
                        if line:
                            try:
                                data = json.loads(line)
                                delta = data.get("message", {}).get("content", "")
                                if delta:
                                    yield delta
                                if data.get("done", False):
                                    break
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
            logger.error(f"[OllamaService] Stream exception: {e} — falling back to Gemini.")
            self._ollama_available = False
            self._last_check_ts = 0.0
            async for chunk in self._gemini_stream(messages, system_content):
                yield chunk

    # ── Public API ─────────────────────────────────────────────────────────────

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        model: str = settings.DEFAULT_MODEL,
        context_memories: str = "",
    ) -> AsyncGenerator[str, None]:
        """
        Primary streaming entry point.
        Routes to Ollama (local) or Gemini (cloud) based on health status.
        """
        system_content = _SYSTEM_PROMPT
        if context_memories:
            system_content += (
                f"\n\n[RETRIEVED USER MEMORIES & CONTEXT]:\n{context_memories}\n"
                "Use these details to personalize your responses."
            )

        ollama_ok = await self._check_ollama()

        if ollama_ok:
            async for chunk in self._ollama_stream(messages, model, system_content):
                yield chunk
        else:
            logger.info("[OllamaService] Routing to Gemini (Ollama offline).")
            async for chunk in self._gemini_stream(messages, system_content):
                yield chunk


ollama_service = OllamaService()
