import urllib.request
import json
import os
from langchain_openai import ChatOpenAI
from rich.console import Console

console = Console()

DEFAULT_9ROUTER_URL = "http://localhost:20128/v1"
DEFAULT_MODEL = "google/gemini-2.5-flash"  # 9Router will map this appropriately or use default

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

def get_llm_client(model_name=DEFAULT_MODEL, temperature=0.0):
    """
    Returns a ChatOpenAI instance configured to communicate with the local 9Router proxy.
    Using OpenAI-compatible client allows standard LangGraph execution.
    """
    # 9Router uses standard api keys, or mock key if require_api_key is false
    api_key = os.environ.get("NINE_ROUTER_API_KEY") or os.environ.get("OPENAI_API_KEY") or "dummy-9router-token"
    
    return ChatOpenAI(
        model=model_name,
        openai_api_key=api_key,
        openai_api_base=DEFAULT_9ROUTER_URL,
        temperature=temperature,
    )
