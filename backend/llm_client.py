import os
import json
import httpx
from typing import Dict, Any, List, Optional

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
DEFAULT_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
FALLBACK_OLLAMA_MODEL = "llama3.2:3b"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

class UnifiedLLMClient:
    """
    Unified LLM Client supporting:
    1. Local Ollama (Primary Sovereign Offline Brain)
    2. Google Gemini API (High-performance multimodal)
    3. Groq API (Ultra-low latency inference)
    4. Heuristic Synthesis Fallback
    """
    def __init__(self):
        self.ollama_available = False
        self.active_provider = "ollama"

    async def check_ollama_health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                res = await client.get(f"{OLLAMA_HOST}/api/tags")
                self.ollama_available = (res.status_code == 200)
                return self.ollama_available
        except Exception:
            self.ollama_available = False
            return False

    async def generate_response(
        self,
        prompt: str,
        system_prompt: str = "",
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 400
    ) -> Dict[str, Any]:
        """
        Attempts execution in sequence:
        1. Local Ollama (with quick 1.5s connect check)
        2. Gemini API (if key configured)
        3. Groq API (if key configured)
        4. Structured fallback
        """
        # 1. Try Ollama (Fast 2.0s connect timeout)
        try:
            target_model = model or DEFAULT_OLLAMA_MODEL
            payload = {
                "model": target_model,
                "prompt": f"{system_prompt}\n\n{prompt}" if system_prompt else prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "top_p": 0.9,
                    "num_predict": max_tokens
                }
            }
            # Short connect timeout so we don't stall when Ollama daemon is paused
            timeout_cfg = httpx.Timeout(connect=1.5, read=25.0, write=5.0, pool=2.0)
            async with httpx.AsyncClient(timeout=timeout_cfg) as client:
                res = await client.post(f"{OLLAMA_HOST}/api/generate", json=payload)
                if res.status_code == 200:
                    text = res.json().get("response", "").strip()
                    return {
                        "success": True,
                        "provider": "ollama",
                        "model": target_model,
                        "content": text
                    }
        except Exception:
            pass

        # 2. Try Gemini if configured
        if GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=GEMINI_API_KEY)
                gmodel = genai.GenerativeModel("gemini-2.5-flash")
                full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
                resp = await gmodel.generate_content_async(full_prompt)
                return {
                    "success": True,
                    "provider": "gemini",
                    "model": "gemini-2.5-flash",
                    "content": resp.text.strip()
                }
            except Exception:
                pass

        # 3. Try Groq if configured
        if GROQ_API_KEY:
            try:
                from groq import AsyncGroq
                client = AsyncGroq(api_key=GROQ_API_KEY)
                chat_completion = await client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    model="llama-3.3-70b-versatile",
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                return {
                    "success": True,
                    "provider": "groq",
                    "model": "llama-3.3-70b-versatile",
                    "content": chat_completion.choices[0].message.content.strip()
                }
            except Exception:
                pass

        return {
            "success": False,
            "provider": "none",
            "model": "fallback",
            "content": "All external LLM endpoints are unreachable. Falling back to local deterministic rule-router."
        }

llm_client = UnifiedLLMClient()
