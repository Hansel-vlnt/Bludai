import os
import json
import time
import urllib.request
from typing import Dict, Any, Optional

SETTINGS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".bludai_settings.json")
ENV_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")

DEFAULT_SETTINGS: Dict[str, Any] = {
    "nine_router_api_key": "",
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

class SettingsManager:
    def __init__(self):
        self.settings: Dict[str, Any] = self._load_settings()
        self.sync_env()

    def _load_settings(self) -> Dict[str, Any]:
        settings = dict(DEFAULT_SETTINGS)
        # Pull existing API key from environment if present
        env_key = os.environ.get("NINE_ROUTER_API_KEY") or os.environ.get("OPENAI_API_KEY")
        if env_key:
            settings["nine_router_api_key"] = env_key

        if os.path.exists(SETTINGS_FILE):
            try:
                with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                    settings.update(saved)
            except Exception as e:
                print(f"[SettingsManager] Failed to load settings from {SETTINGS_FILE}: {e}")
        return settings

    def save_settings(self) -> bool:
        try:
            with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(self.settings, f, indent=2)
            self.sync_env()
            return True
        except Exception as e:
            print(f"[SettingsManager] Failed to save settings: {e}")
            return False

    def sync_env(self):
        """Synchronizes settings with os.environ and updates backend/.env file."""
        api_key = self.settings.get("nine_router_api_key", "")
        base_url = self.settings.get("nine_router_base_url", "http://localhost:20128/v1")
        
        if api_key:
            os.environ["NINE_ROUTER_API_KEY"] = api_key
            os.environ["OPENAI_API_KEY"] = api_key
        if base_url:
            os.environ["NINE_ROUTER_BASE_URL"] = base_url

        # Persist to .env
        try:
            with open(ENV_FILE, "w", encoding="utf-8") as f:
                f.write(f'NINE_ROUTER_API_KEY="{api_key}"\n')
                f.write(f'OPENAI_API_KEY="{api_key}"\n')
                f.write(f'NINE_ROUTER_BASE_URL="{base_url}"\n')
        except Exception as e:
            print(f"[SettingsManager] Failed to write .env: {e}")

    def get_settings(self) -> Dict[str, Any]:
        return dict(self.settings)

    def update_settings(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        for k, v in updates.items():
            if k in DEFAULT_SETTINGS:
                self.settings[k] = v
        self.save_settings()
        return dict(self.settings)

    def get_api_key(self) -> str:
        return self.settings.get("nine_router_api_key") or os.environ.get("NINE_ROUTER_API_KEY", "")

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
