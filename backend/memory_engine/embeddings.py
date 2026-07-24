"""
Phase 3 — Multi-Provider Embedding Service

Priority chain:
  1. bge-m3         (Ollama — best quality, requires: ollama pull bge-m3)
  2. nomic-embed-text (Ollama — good quality, requires: ollama pull nomic-embed-text)
  3. sentence-transformers (local Python, auto-downloaded — ~90MB)
  4. TF-IDF cosine similarity (zero dependencies, always available)

Embeddings are stored in ChromaDB. When Ollama is offline, the system
automatically falls back down the priority chain and still functions.
"""

import asyncio
import math
import re
from typing import Dict, List, Optional, Tuple

from backend.utils.logger import logger

# ── TF-IDF Utilities (always available) ───────────────────────────────────────


def _tokenize(text: str) -> List[str]:
    return re.findall(r"\w+", text.lower())


def _compute_tf(tokens: List[str]) -> Dict[str, float]:
    tf: Dict[str, float] = {}
    for t in tokens:
        tf[t] = tf.get(t, 0.0) + 1.0
    total = sum(tf.values()) or 1.0
    return {t: v / total for t, v in tf.items()}


def _cosine_sim(v1: Dict[str, float], v2: Dict[str, float]) -> float:
    keys = set(v1) & set(v2)
    num = sum(v1[k] * v2[k] for k in keys)
    d1 = math.sqrt(sum(x**2 for x in v1.values()))
    d2 = math.sqrt(sum(x**2 for x in v2.values()))
    return num / (d1 * d2) if d1 and d2 else 0.0


def tfidf_similarity(query: str, candidates: List[str]) -> List[float]:
    q_tf = _compute_tf(_tokenize(query))
    return [_cosine_sim(q_tf, _compute_tf(_tokenize(c))) for c in candidates]


# ── Sentence-Transformers Cache ────────────────────────────────────────────────

_st_model = None
_st_available: Optional[bool] = None


def _get_st_model():
    global _st_model, _st_available
    if _st_available is False:
        return None
    if _st_model is not None:
        return _st_model
    try:
        from sentence_transformers import SentenceTransformer

        _st_model = SentenceTransformer("all-MiniLM-L6-v2")
        _st_available = True
        logger.info("[Embeddings] SentenceTransformer (all-MiniLM-L6-v2) loaded.")
        return _st_model
    except Exception as e:
        _st_available = False
        logger.warning(f"[Embeddings] sentence-transformers unavailable: {e}")
        return None


# ── Ollama Embedding Provider ──────────────────────────────────────────────────

_OLLAMA_EMBED_MODELS = ["bge-m3", "nomic-embed-text"]
_active_ollama_model: Optional[str] = None
_ollama_checked: bool = False


async def _check_ollama_embed() -> Optional[str]:
    """Return the best available Ollama embedding model, or None."""
    global _active_ollama_model, _ollama_checked
    if _ollama_checked:
        return _active_ollama_model

    import os

    import httpx

    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(f"{base_url}/api/tags")
            if res.status_code != 200:
                _ollama_checked = True
                return None
            installed = {m["name"].split(":")[0] for m in res.json().get("models", [])}
            for preferred in _OLLAMA_EMBED_MODELS:
                if preferred in installed:
                    _active_ollama_model = preferred
                    logger.info(f"[Embeddings] Using Ollama model: {preferred}")
                    _ollama_checked = True
                    return preferred
    except Exception as e:
        logger.debug(f"[Embeddings] Ollama check failed: {e}")
    _ollama_checked = True
    return None


async def _embed_ollama(texts: List[str], model: str) -> Optional[List[List[float]]]:
    """Get embeddings from Ollama."""
    import os

    import httpx

    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            results = []
            for text in texts:
                res = await client.post(
                    f"{base_url}/api/embeddings", json={"model": model, "prompt": text}
                )
                if res.status_code == 200:
                    results.append(res.json().get("embedding", []))
                else:
                    return None
            return results
    except Exception as e:
        logger.warning(f"[Embeddings] Ollama embed failed: {e}")
        return None


# ── Sentence Transformer Embeddings ───────────────────────────────────────────


async def _embed_sentence_transformers(texts: List[str]) -> Optional[List[List[float]]]:
    model = _get_st_model()
    if model is None:
        return None
    try:
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(None, lambda: model.encode(texts).tolist())
        return embeddings
    except Exception as e:
        logger.warning(f"[Embeddings] SentenceTransformer embed failed: {e}")
        return None


# ── Public API ─────────────────────────────────────────────────────────────────


class EmbeddingService:
    """
    Multi-provider embedding service.
    Priority: bge-m3 > nomic-embed-text > sentence-transformers > TF-IDF proxy
    """

    def __init__(self):
        self._provider: Optional[str] = None

    async def embed(self, texts: List[str]) -> Tuple[List[List[float]], str]:
        """
        Return (embeddings_list, provider_name).
        embeddings_list[i] is the embedding vector for texts[i].
        Falls back gracefully down the chain.
        """
        # ── 1. Try Ollama ──────────────────────────────────────────────────────
        ollama_model = await _check_ollama_embed()
        if ollama_model:
            vecs = await _embed_ollama(texts, ollama_model)
            if vecs and len(vecs) == len(texts):
                self._provider = f"ollama/{ollama_model}"
                return vecs, self._provider

        # ── 2. Try SentenceTransformers ────────────────────────────────────────
        vecs = await _embed_sentence_transformers(texts)
        if vecs and len(vecs) == len(texts):
            self._provider = "sentence-transformers"
            return vecs, self._provider

        # ── 3. TF-IDF proxy (returns zero vectors — used for ChromaDB storage) ─
        # We store a dummy zero vector so ChromaDB can still store the document.
        # Similarity search will use TF-IDF as fallback.
        logger.warning(
            "[Embeddings] All embedding providers failed — using zero vectors (TF-IDF search active)."
        )
        dim = 384
        vecs = [[0.0] * dim for _ in texts]
        self._provider = "tfidf-fallback"
        return vecs, self._provider

    async def embed_one(self, text: str) -> Tuple[List[float], str]:
        vecs, provider = await self.embed([text])
        return vecs[0], provider

    @property
    def provider(self) -> Optional[str]:
        return self._provider

    def reset_cache(self):
        """Force re-detection of Ollama models on next call."""
        global _ollama_checked, _active_ollama_model
        _ollama_checked = False
        _active_ollama_model = None


embedding_service = EmbeddingService()
