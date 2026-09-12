import urllib.request
import json
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from rich.console import Console

# Load environment variables from backend/.env if it exists
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

console = Console()

from bludai.core.settings_manager import settings_manager
from bludai.core.models_manager import models_manager

DEFAULT_9ROUTER_URL = "http://localhost:20128/v1"
DEFAULT_MODEL = os.environ.get("BLUDAI_MODEL", "ag/gemini-3.8-flash")

def check_9router_status(url: str = None) -> bool:
    """Checks if the 9Router proxy is up and responding, using dynamic settings and auth if available."""
    try:
        base_url = (url or settings_manager.get_base_url()).rstrip("/")
        models_url = f"{base_url}/models"
        api_key = settings_manager.get_api_key()

        req = urllib.request.Request(
            models_url, 
            method="GET",
            headers={
                "User-Agent": "Bludai-Client/1.0",
                "Accept": "application/json"
            }
        )
        if api_key:
            req.add_header("Authorization", f"Bearer {api_key}")

        with urllib.request.urlopen(req, timeout=2.5) as response:
            if response.status == 200:
                return True
    except Exception:
        pass
    return False

def get_llm_client(role: str = None, model_id: str = None, temperature: float = 0.0):
    """
    Returns a ChatOpenAI instance configured to communicate with the local 9Router proxy
    or any custom OpenAI-compatible endpoint configured in Settings.
    """
    if model_id:
        model_name = model_id
    elif role:
        model_name = models_manager.get_model_for_role(role)
    else:
        model_name = models_manager.get_best_default_model()

    api_key = settings_manager.get_api_key() or "dummy-9router-token"
    base_url = settings_manager.get_base_url()
    max_tokens = settings_manager.get_settings().get("max_tokens", 4096)
    
    return ChatOpenAI(
        model=model_name,
        openai_api_key=api_key,
        openai_api_base=base_url,
        temperature=temperature,
        max_tokens=max_tokens,
    )
