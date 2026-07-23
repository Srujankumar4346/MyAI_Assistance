import httpx
import json
import os
from typing import AsyncGenerator, List, Dict, Any
from backend.core.config import settings
from backend.utils.logger import logger

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


class OllamaService:
    def __init__(self, base_url: str = settings.OLLAMA_BASE_URL):
        self.base_url = base_url
        self._ollama_available = None  # None = not yet checked

    async def _check_ollama(self) -> bool:
        """Check if Ollama is reachable (cached per process)."""
        if self._ollama_available is not None:
            return self._ollama_available
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                self._ollama_available = res.status_code == 200
        except Exception:
            self._ollama_available = False
        logger.info(f"Ollama available: {self._ollama_available}")
        return self._ollama_available

    async def list_models(self) -> List[str]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m["name"] for m in data.get("models", [])]
                    return models if models else ["gemma", "llama3", "qwen", "mistral"]
        except Exception as e:
            logger.warning(f"Could not connect to Ollama at {self.base_url}: {e}")
        return ["gemma", "llama3", "qwen", "mistral"]

    async def _gemini_stream(
        self,
        messages: List[Dict[str, str]],
        system_content: str
    ) -> AsyncGenerator[str, None]:
        """Stream responses from Google Gemini API (cloud fallback)."""
        if not GEMINI_API_KEY:
            yield (
                "AI service is offline. "
                "To enable AI on the cloud, add GEMINI_API_KEY to your Render environment variables."
            )
            return

        # Build Gemini contents (user/model alternating)
        contents = []
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
                        logger.error(f"Gemini API error {response.status_code}: {body}")
                        yield f"Gemini API error {response.status_code}. Check your API key in Render settings."
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
            logger.error(f"Gemini streaming exception: {e}")
            yield f"Cloud AI error: {str(e)}"

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        model: str = settings.DEFAULT_MODEL,
        context_memories: str = ""
    ) -> AsyncGenerator[str, None]:

        # System prompt: concise and direct
        system_content = (
            "You are NOVA_X, a fast personal AI assistant. "
            "CRITICAL DIRECTIVE: Give VERY SHORT, direct, and concise answers (1 to 2 brief sentences maximum). "
            "Do NOT give long paragraphs, lists, or unnecessary details unless explicitly requested. "
            "Answer immediately and stay strictly to the point."
        )
        if context_memories:
            system_content += (
                f"\n\n[RETRIEVED USER MEMORIES & CONTEXT]:\n{context_memories}\n"
                "Use these details to personalize your responses."
            )

        # Auto-detect Ollama; fall back to Gemini if unavailable
        ollama_ok = await self._check_ollama()
        if not ollama_ok:
            logger.info("Ollama not available — routing to Gemini API.")
            async for chunk in self._gemini_stream(messages, system_content):
                yield chunk
            return

        # ── Ollama path ──────────────────────────────────────────────────────
        url = f"{self.base_url}/api/chat"
        installed = await self.list_models()

        if model not in installed and installed:
            matched = None
            req_prefix = model.split(":")[0].lower()
            for m in installed:
                inst_prefix = m.split(":")[0].lower()
                if inst_prefix == req_prefix or req_prefix in inst_prefix or inst_prefix in req_prefix:
                    matched = m
                    break
            if matched:
                model = matched
            else:
                general_keywords = ["llama", "qwen", "gemma", "mistral", "phi"]
                fallback_model = None
                for keyword in general_keywords:
                    for m in installed:
                        if keyword in m.lower():
                            fallback_model = m
                            break
                    if fallback_model:
                        break
                if not fallback_model:
                    fallback_model = installed[0]
                logger.info(f"Falling back to '{fallback_model}'.")
                model = fallback_model

        formatted_messages = [{"role": "system", "content": system_content}] + messages
        payload = {
            "model": model,
            "messages": formatted_messages,
            "stream": True,
            "options": {
                "num_predict": 100,
                "temperature": 0.6,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code != 200:
                        logger.warning(f"Ollama returned HTTP {response.status_code} — falling back to Gemini.")
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
            logger.error(f"Ollama streaming exception: {e}")
            logger.info("Falling back to Gemini after Ollama exception.")
            async for chunk in self._gemini_stream(messages, system_content):
                yield chunk


ollama_service = OllamaService()
