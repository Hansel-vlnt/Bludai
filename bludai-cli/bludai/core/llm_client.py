import urllib.request
import json
import os
from langchain_openai import ChatOpenAI
from rich.console import Console

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

def get_llm_client(role: str = None, temperature: float = 0.0):
    """
    Returns a ChatOpenAI instance configured to communicate with the local 9Router proxy.
    If a role is provided (e.g. 'Supervisor'), it fetches the assigned model.
    """
    model_name = DEFAULT_MODEL
    if role:
        assigned_model = models_manager.get_model_for_role(role)
        if assigned_model:
            model_name = assigned_model

    # 9Router uses standard api keys, or mock key if require_api_key is false
    api_key = os.environ.get("NINE_ROUTER_API_KEY") or os.environ.get("OPENAI_API_KEY") or "dummy-9router-token"
    
    return ChatOpenAI(
        model=model_name,
        openai_api_key=api_key,
        openai_api_base=DEFAULT_9ROUTER_URL,
        temperature=temperature,
    )
