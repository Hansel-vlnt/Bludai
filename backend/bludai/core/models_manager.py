import json
import os
import time
import urllib.request
import urllib.error
from typing import Dict, List, Optional

# Default roles mapping file in backend directory
ROLES_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".bludai_roles.json")

class ModelsManager:
    def __init__(self):
        self.roles: Dict[str, str] = self._load_roles()
        self._cached_models: List[str] = []
        self._cache_timestamp: float = 0.0
        self.cache_ttl: float = 30.0  # Cache for 30 seconds

    def _load_roles(self) -> Dict[str, str]:
        if os.path.exists(ROLES_FILE):
            try:
                with open(ROLES_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[ModelsManager] Failed to load roles from {ROLES_FILE}: {e}")
                return {}
        return {}

    def _save_roles(self):
        try:
            with open(ROLES_FILE, "w", encoding="utf-8") as f:
                json.dump(self.roles, f, indent=4)
        except Exception as e:
            print(f"[ModelsManager] Error saving roles: {e}")

    def get_model_for_role(self, role: str) -> str:
        """Returns the assigned model for a role, or falls back to best default model."""
        assigned = self.roles.get(role)
        if assigned:
            return assigned
        return self.get_best_default_model()

    def set_model_for_role(self, role: str, model_name: str):
        """Assigns a model to a specific role."""
        self.roles[role] = model_name
        self._save_roles()
        
    def get_all_roles(self) -> Dict[str, str]:
        return dict(self.roles)

    def get_available_models(self, force_refresh: bool = False) -> List[str]:
        """Queries 9Router / configured proxy for available models with caching and auth headers."""
        now = time.time()
        if not force_refresh and self._cached_models and (now - self._cache_timestamp < self.cache_ttl):
            return list(self._cached_models)

        from bludai.core.settings_manager import settings_manager

        base_url = settings_manager.get_base_url().rstrip("/")
        url = f"{base_url}/models"
        api_key = settings_manager.get_api_key()

        try:
            req = urllib.request.Request(
                url, 
                method="GET",
                headers={
                    "User-Agent": "Bludai-Client/1.0",
                    "Accept": "application/json"
                }
            )
            if api_key:
                req.add_header("Authorization", f"Bearer {api_key}")

            with urllib.request.urlopen(req, timeout=3.5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    models: List[str] = []

                    # Standard OpenAI format: {"data": [{"id": "..."}, ...]}
                    if isinstance(data, dict) and "data" in data and isinstance(data["data"], list):
                        for item in data["data"]:
                            if isinstance(item, dict) and "id" in item:
                                models.append(item["id"])
                            elif isinstance(item, str):
                                models.append(item)
                    # Alternate format: [{"id": "..."}, ...] or ["model1", "model2"]
                    elif isinstance(data, list):
                        for item in data:
                            if isinstance(item, dict) and "id" in item:
                                models.append(item["id"])
                            elif isinstance(item, str):
                                models.append(item)
                    elif isinstance(data, dict) and "models" in data and isinstance(data["models"], list):
                        for item in data["models"]:
                            if isinstance(item, dict) and "id" in item:
                                models.append(item["id"])
                            elif isinstance(item, str):
                                models.append(item)

                    if models:
                        self._cached_models = models
                        self._cache_timestamp = now
                        return list(models)
        except Exception as e:
            # If network error occurs but we have prior cache, use it
            if self._cached_models:
                return list(self._cached_models)
            print(f"[ModelsManager] Could not fetch models from {url}: {e}")

        return list(self._cached_models)

    def get_best_default_model(self) -> str:
        """
        Returns the best active model identifier.
        Validates configured default against live models; if invalid, automatically
        selects the premier available model and synchronizes settings.
        """
        from bludai.core.settings_manager import settings_manager
        
        configured = settings_manager.get_settings().get("default_model")
        available = self.get_available_models()

        if configured and configured in available:
            return configured

        # If configured is not currently in available models, pick an available one
        if available:
            # Prioritize fast/reliable models
            preferred_order = [
                "ag/gemini-3.8-flash",
                "ag/gemini-3.8-flash-high",
                "ag/gemini-3.7-flash",
                "ag/gemini-3.7-flash-high",
                "ag/gemini-3-flash",
                "ag/claude-sonnet-4-6",
            ]
            chosen = None
            for p in preferred_order:
                if p in available:
                    chosen = p
                    break
            
            if not chosen:
                chosen = available[0]

            # Self-heal settings with the valid model
            settings_manager.update_settings({"default_model": chosen})
            return chosen

        return configured or "ag/gemini-3.8-flash"

models_manager = ModelsManager()
