import os
import json
import time
import urllib.request
from typing import Dict, Any, Optional

SETTINGS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".bludai_settings.json")
ENV_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")

DEFAULT_SETTINGS: Dict[str, Any] = {
    "nine_router_base_url": "http://localhost:20128/v1",
    "default_model": "meta-llama/llama-3-8b-instruct:free",
    "default_temperature": 0.5,
    "max_tokens": 4096,
    "system_instructions": "You are Bludai, an elite autonomous AI software engineer and terminal assistant. Provide clean, modular, and robust code. Think step-by-step, maintain clarity, and follow best engineering practices.",
    "execution_mode": "auto",  # "auto" or "supervised"
    "max_steps": 25,
    "show_thinking": True,
    "theme_accent": "cyan"     # "cyan", "green", "amber", "purple"
}

from dotenv import load_dotenv

class SettingsManager:
    def __init__(self):
        if os.path.exists(ENV_FILE):
            load_dotenv(ENV_FILE, override=True)
        self.settings: Dict[str, Any] = self._load_settings()
        self.sync_env()

    def _load_settings(self) -> Dict[str, Any]:
        settings = dict(DEFAULT_SETTINGS)

        # Load from .bludai_settings.json if available (UI & model preferences only)
        if os.path.exists(SETTINGS_FILE):
            try:
                with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                    # Safety check: ensure no API keys are ever read from JSON
                    saved.pop("nine_router_api_key", None)
                    saved.pop("api_key", None)
                    settings.update(saved)
            except Exception as e:
                print(f"[SettingsManager] Failed to load settings from {SETTINGS_FILE}: {e}")

        return settings

    def save_settings(self) -> bool:
        try:
            # Strictly ensure no secrets exist in the saved dictionary
            safe_settings = {
                k: v for k, v in self.settings.items() 
                if not k.endswith("api_key") and k != "api_key"
            }
            with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(safe_settings, f, indent=2)
            self.sync_env()
            return True
        except Exception as e:
            print(f"[SettingsManager] Failed to save settings: {e}")
            return False

    def sync_env(self):
        """Ensures base URL and non-secret env vars are synchronized without altering API keys."""
        base_url = self.settings.get("nine_router_base_url", "http://localhost:20128/v1").strip()
        if base_url:
            os.environ["NINE_ROUTER_BASE_URL"] = base_url

        # Check if NINE_ROUTER_BASE_URL is in .env; if missing or changed, update it safely
        if os.path.exists(ENV_FILE):
            lines = []
            found_url = False
            with open(ENV_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("NINE_ROUTER_BASE_URL="):
                        lines.append(f'NINE_ROUTER_BASE_URL="{base_url}"\n')
                        found_url = True
                    else:
                        lines.append(line)
            if not found_url:
                lines.append(f'NINE_ROUTER_BASE_URL="{base_url}"\n')
            with open(ENV_FILE, "w", encoding="utf-8") as f:
                f.writelines(lines)

    def get_settings(self) -> Dict[str, Any]:
        return dict(self.settings)

    def update_settings(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        for k, v in updates.items():
            if k in DEFAULT_SETTINGS and not k.endswith("api_key"):
                self.settings[k] = v
        self.save_settings()
        return dict(self.settings)

    def get_api_key(self) -> str:
        """Reads API key strictly from environment or backend/.env file."""
        if os.path.exists(ENV_FILE):
            load_dotenv(ENV_FILE, override=True)
        return os.environ.get("NINE_ROUTER_API_KEY") or os.environ.get("OPENAI_API_KEY") or ""

    def set_api_key(self, api_key: str):
        """Writes API key strictly to backend/.env file and updates current process environment."""
        api_key = api_key.strip()
        os.environ["NINE_ROUTER_API_KEY"] = api_key
        os.environ["OPENAI_API_KEY"] = api_key

        lines = []
        found_nine = False
        found_openai = False

        if os.path.exists(ENV_FILE):
            with open(ENV_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("NINE_ROUTER_API_KEY="):
                        lines.append(f'NINE_ROUTER_API_KEY="{api_key}"\n')
                        found_nine = True
                    elif line.startswith("OPENAI_API_KEY="):
                        lines.append(f'OPENAI_API_KEY="{api_key}"\n')
                        found_openai = True
                    else:
                        lines.append(line)

        if not found_nine:
            lines.append(f'NINE_ROUTER_API_KEY="{api_key}"\n')
        if not found_openai:
            lines.append(f'OPENAI_API_KEY="{api_key}"\n')

        with open(ENV_FILE, "w", encoding="utf-8") as f:
            f.writelines(lines)

    def get_base_url(self) -> str:
        return self.settings.get("nine_router_base_url") or os.environ.get("NINE_ROUTER_BASE_URL", "http://localhost:20128/v1")

    def get_system_instructions(self) -> str:
        return self.settings.get("system_instructions", "").strip()

    def test_connection(self, base_url: Optional[str] = None, api_key: Optional[str] = None) -> Dict[str, Any]:
        target_url = (base_url or self.get_base_url()).rstrip("/") + "/models"
        key = api_key if api_key is not None else self.get_api_key()

        req = urllib.request.Request(target_url, method="GET")
        if key:
            req.add_header("Authorization", f"Bearer {key}")

        start_time = time.time()
        try:
            with urllib.request.urlopen(req, timeout=4.0) as response:
                latency_ms = int((time.time() - start_time) * 1000)
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    models_count = len(data.get("data", []))
                    return {
                        "status": "success",
                        "latency_ms": latency_ms,
                        "models_found": models_count,
                        "message": f"Connected ({latency_ms}ms, {models_count} models found)"
                    }
                else:
                    return {
                        "status": "error",
                        "message": f"HTTP {response.status}: {response.reason}"
                    }
        except urllib.error.HTTPError as e:
            return {
                "status": "error",
                "message": f"HTTP Error {e.code}: {e.reason}"
            }
        except urllib.error.URLError as e:
            return {
                "status": "error",
                "message": f"Connection refused: {e.reason}"
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }

settings_manager = SettingsManager()
