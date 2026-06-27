import json
import os
import urllib.request
from typing import Dict, List, Optional

# Default roles mapping
ROLES_FILE = os.path.join(os.getcwd(), ".bludai_roles.json")

class ModelsManager:
    def __init__(self):
        self.roles: Dict[str, str] = self._load_roles()

    def _load_roles(self) -> Dict[str, str]:
        if os.path.exists(ROLES_FILE):
            try:
                with open(ROLES_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def _save_roles(self):
        try:
            with open(ROLES_FILE, "w", encoding="utf-8") as f:
                json.dump(self.roles, f, indent=4)
        except Exception as e:
            print(f"Error saving roles: {e}")

    def get_model_for_role(self, role: str) -> Optional[str]:
        """Returns the assigned model for a role, or None if not assigned."""
        return self.roles.get(role)

    def set_model_for_role(self, role: str, model_name: str):
        """Assigns a model to a specific role."""
        self.roles[role] = model_name
        self._save_roles()
        
    def get_all_roles(self) -> Dict[str, str]:
        return self.roles

    def get_available_models(self) -> List[str]:
        """Queries 9Router for available models."""
        url = "http://localhost:20128/v1/models"
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=3.0) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    # 9Router/OpenAI v1/models returns {"data": [{"id": "model_id", ...}]}
                    if "data" in data:
                        return [m.get("id") for m in data["data"]]
        except Exception:
            pass
        return []

models_manager = ModelsManager()
