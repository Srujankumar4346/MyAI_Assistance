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
                # Prioritize general-purpose models (llama, qwen, gemma, mistral, phi) over specialized coder models
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
                logger.info(f"Selected model '{model}' is not installed in Ollama. Falling back to '{fallback_model}'.")
                model = fallback_model

        # System prompt prioritizing fast, concise, direct answers
        system_content = (
            "You are NOVA_X, a fast personal voice AI assistant. "
            "CRITICAL DIRECTIVE: Give VERY SHORT, direct, and concise answers (1 to 2 brief sentences maximum). "
            "Do NOT give long paragraphs, lists, or unnecessary details unless explicitly requested. "
            "Answer immediately and stay strictly to the point."
        )
        if context_memories:
            system_content += f"\n\n[RETRIEVED USER MEMORIES & CONTEXT]:\n{context_memories}\nUse these details to personalize your responses."

        formatted_messages = [{"role": "system", "content": system_content}] + messages
        
        payload = {
            "model": model,
            "messages": formatted_messages,
            "stream": True,
            "options": {
                "num_predict": 100,  # Limit max tokens for super fast generation
                "temperature": 0.6,
            }
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
            yield f"[NOVA_X Offline Simulation Mode]: Ollama service connection failed. Details: {str(e)}. Please ensure 'ollama serve' is running locally with the requested model ('{model}')."

ollama_service = OllamaService()
