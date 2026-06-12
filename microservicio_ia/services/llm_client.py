import os
import httpx
import logging

logger = logging.getLogger(__name__)

class LLMClient:
    def __init__(self):
        # Usamos la API key provista por el usuario, con fallback si ya se definió en .env
        self.api_key = os.getenv("GROQ_API_KEY", "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")
        self.model = "llama-3.3-70b-versatile"
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    def generate_content(self, prompt: str) -> str:
        if not self.api_key:
            logger.warning("[LLMClient] Sin GROQ_API_KEY. Retornando vacío.")
            return ""
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2
        }
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(self.base_url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                return content.strip()
        except Exception as e:
            logger.error(f"[LLMClient] Error al llamar a Groq: {e}")
            raise e

    async def generate_content_async(self, prompt: str) -> str:
        if not self.api_key:
            logger.warning("[LLMClient] Sin GROQ_API_KEY. Retornando vacío.")
            return ""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.base_url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                return content.strip()
        except Exception as e:
            logger.error(f"[LLMClient] Error asíncrono al llamar a Groq: {e}")
            raise e
