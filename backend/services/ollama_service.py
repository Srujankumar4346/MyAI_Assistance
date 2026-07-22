import httpx
import json
from typing import AsyncGenerator, List, Dict, Any
from backend.core.config import settings
from backend.utils.logger import logger

class OllamaService:
    def __init__(self, base_url: str = settings.OLLAMA_BASE_URL):
        self.base_url = base_url

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

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        model: str = settings.DEFAULT_MODEL,
        context_memories: str = ""
    ) -> AsyncGenerator[str, None]:
        url = f"{self.base_url}/api/chat"
        
        # Check installed models and perform fallback if necessary
        installed = await self.list_models()
        if model not in installed and installed:
            matched = None
            req_prefix = model.split(':')[0].lower()
            for m in installed:
                inst_prefix = m.split(':')[0].lower()
                if inst_prefix == req_prefix or req_prefix in inst_prefix or inst_prefix in req_prefix:
                    matched = m
                    break
            if matched:
                model = matched
            else:
                fallback_model = installed[0]
                yield f"⚠️ Selected model '{model}' is not installed in Ollama. Falling back to '{fallback_model}'.\n\n"
                model = fallback_model

        # Inject long term memory if present
        system_content = "You are SAI (Srujan Artificial Intelligence), an advanced personal AI operating system assistant."
        if context_memories:
            system_content += f"\n\n[RETRIEVED USER MEMORIES & CONTEXT]:\n{context_memories}\nUse these details to personalize your responses."

        formatted_messages = [{"role": "system", "content": system_content}] + messages
        
        payload = {
            "model": model,
            "messages": formatted_messages,
            "stream": True
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code != 200:
                        yield f"Error connecting to Ollama (HTTP {response.status_code}). Ensure Ollama is running at {self.base_url}."
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
            yield f"[SAI Offline Simulation Mode]: Ollama service connection failed. Details: {str(e)}. Please ensure 'ollama serve' is running locally with the requested model ('{model}')."

ollama_service = OllamaService()
