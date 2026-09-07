import urllib.request
import json
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from rich.console import Console

# Load environment variables from backend/.env if it exists
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

console = Console()

DEFAULT_9ROUTER_URL = "http://localhost:20128/v1"
# Anda bisa mengganti "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free" dengan model OpenRouter lainnya
DEFAULT_MODEL = os.environ.get("BLUDAI_MODEL", "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free")

def check_9router_status(url=DEFAULT_9ROUTER_URL) -> bool:
    """Checks if the 9Router proxy is up and responding."""
    try:
        # Check health endpoint or models endpoint
        # e.g., url/models
        models_url = f"{url}/models"
        req = urllib.request.Request(models_url, method="GET")
        with urllib.request.urlopen(req, timeout=2.0) as response:
            if response.status == 200:
                return True
    except Exception:
        pass
    return False

from bludai.core.models_manager import models_manager
from bludai.core.settings_manager import settings_manager

def get_llm_client(role: str = None, model_id: str = None, temperature: float = 0.0):
    """
    Returns a ChatOpenAI instance configured to communicate with the local 9Router proxy
    or any custom OpenAI-compatible endpoint configured in Settings.
    """
    configured_default = settings_manager.get_settings().get("default_model") or DEFAULT_MODEL
    model_name = configured_default
    if model_id:
        model_name = model_id
    elif role:
        assigned_model = models_manager.get_model_for_role(role)
        if assigned_model:
            model_name = assigned_model

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
