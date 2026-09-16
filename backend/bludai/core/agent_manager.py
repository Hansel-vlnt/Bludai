import os
import json
import re
from typing import Dict, List, Optional, Any
from bludai.core.models_manager import models_manager

AGENTS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".bludai_agents.json")

DEFAULT_AGENTS: List[Dict[str, Any]] = [
    {
        "id": "developer",
        "name": "Developer",
        "title": "Full-Stack Software Engineer",
        "description": "Searches, reads, creates, and refactors codebase files and implementations.",
        "system_prompt": """You are the Developer specialist of the BLUDAI Multi-Agent System.
Your job is to search, read, create, and modify codebase files in the local workspace based on the Supervisor's instructions.

Guidelines:
1. Write clean, bug-free, and well-structured code.
2. Use `semantic_code_search` to locate existing components or logic across the project.
3. Use `create_file` to create new files.
4. Use `read_file` to read the contents of existing files.
5. Use `replace_content` to edit existing files. The replacement target must match exact whitespace.
6. When you have completed the file operations assigned by the Supervisor, write a clear summary of what you did and return control.""",
        "model": "",
        "temperature": 0.2,
        "tools": ["create_file", "read_file", "replace_content", "semantic_code_search", "index_project_codebase"],
        "enabled": True,
        "is_system": True,
        "icon": "Code",
        "color": "#00E5FF"
    },
    {
        "id": "executor",
        "name": "Executor",
        "title": "DevOps & Terminal Specialist",
        "description": "Executes shell commands, runs test suites, checks build statuses, and manages terminal processes.",
        "system_prompt": """You are the Executor specialist of the BLUDAI Multi-Agent System.
Your job is to execute terminal commands (such as running tests, installing packages, compiling code, or checking directory listings) on the local host as instructed by the Supervisor.

Guidelines:
1. Only run commands when explicitly requested by the Supervisor.
2. If a command fails, report the error output and exit code clearly so the Supervisor can delegate a fix.
3. When you have completed the commands assigned, write a clear summary of the terminal outputs and return control.""",
        "model": "",
        "temperature": 0.1,
        "tools": ["run_terminal_command"],
        "enabled": True,
        "is_system": True,
        "icon": "Terminal",
        "color": "#10b981"
    },
    {
        "id": "code_reviewer",
        "name": "CodeReviewer",
        "title": "Security & Quality Auditor",
        "description": "Analyzes code for security vulnerabilities, logic bugs, syntax errors, and architectural quality.",
        "system_prompt": """You are the Code Reviewer specialist of the BLUDAI Multi-Agent System.
Your job is to inspect files, audit code quality, check for security bugs, and verify logic without modifying files.

Guidelines:
1. Use `read_file` and `semantic_code_search` to review target files.
2. Identify security vulnerabilities (OWASP, injection, leaks), edge-case bugs, or performance issues.
3. Provide concrete recommendations and code diff suggestions with file paths and line numbers.
4. Do not modify files directly; return your findings to the Supervisor.""",
        "model": "",
        "temperature": 0.1,
        "tools": ["read_file", "semantic_code_search"],
        "enabled": True,
        "is_system": False,
        "icon": "ShieldCheck",
        "color": "#f59e0b"
    },
    {
        "id": "researcher",
        "name": "Researcher",
        "title": "Internet & Codebase Research Specialist",
        "description": "Searches the live web in real-time, investigates codebase structure, and analyzes documentation.",
        "system_prompt": """You are the Researcher specialist of the BLUDAI Multi-Agent System.
Your job is to search the live web for real-time information, explore the codebase, query semantic vector memory, and synthesize knowledge for the Supervisor.

Guidelines:
1. Use `web_search` to find live internet news, recent releases, current benchmarks, and external documentation.
2. Use `semantic_code_search` and `read_file` to thoroughly explore relevant project code.
3. Summarize your findings clearly with links and citations, and return your synthesized research to the Supervisor.""",
        "model": "",
        "temperature": 0.2,
        "tools": ["web_search", "semantic_code_search", "read_file", "index_project_codebase"],
        "enabled": True,
        "is_system": False,
        "icon": "Search",
        "color": "#a855f7"
    }
]

class AgentManager:
    def __init__(self):
        self._agents: List[Dict[str, Any]] = self._load_agents()

    def _load_agents(self) -> List[Dict[str, Any]]:
        if os.path.exists(AGENTS_FILE):
            try:
                with open(AGENTS_FILE, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                    if isinstance(saved, list) and len(saved) > 0:
                        # Ensure researcher has web_search
                        for a in saved:
                            if a.get("id") == "researcher" and "web_search" not in a.get("tools", []):
                                a.setdefault("tools", []).insert(0, "web_search")
                        return saved
            except Exception as e:
                print(f"[AgentManager] Failed to load {AGENTS_FILE}: {e}")
        
        # Save default template
        self._save_agents(DEFAULT_AGENTS)
        return list(DEFAULT_AGENTS)

    def _save_agents(self, agents_list: List[Dict[str, Any]]):
        try:
            with open(AGENTS_FILE, "w", encoding="utf-8") as f:
                json.dump(agents_list, f, indent=2)
        except Exception as e:
            print(f"[AgentManager] Failed to save {AGENTS_FILE}: {e}")

    def get_all_agents(self) -> List[Dict[str, Any]]:
        """Returns all configured agents."""
        return list(self._agents)

    def get_enabled_agents(self) -> List[Dict[str, Any]]:
        """Returns only active/enabled worker agents."""
        return [a for a in self._agents if a.get("enabled", True)]

    def get_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Finds an agent by its unique ID."""
        for a in self._agents:
            if a.get("id") == agent_id:
                return a
        return None

    def get_agent_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Finds an agent by its display name (case-insensitive)."""
        target = name.strip().lower()
        for a in self._agents:
            if a.get("name", "").strip().lower() == target:
                return a
        return None

    def create_agent(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validates and creates a new custom agent."""
        raw_name = str(data.get("name") or "CustomAgent").strip()
        # Ensure clean alphanumeric name for LangGraph routing node
        clean_name = re.sub(r"[^a-zA-Z0-9_]", "", raw_name) or "CustomAgent"
        agent_id = str(data.get("id") or clean_name.lower())
        
        # Ensure unique ID
        base_id = agent_id
        counter = 1
        while any(a.get("id") == agent_id for a in self._agents):
            agent_id = f"{base_id}_{counter}"
            counter += 1

        new_agent = {
            "id": agent_id,
            "name": clean_name,
            "title": str(data.get("title") or clean_name),
            "description": str(data.get("description") or f"Specialist handling {clean_name} tasks."),
            "system_prompt": str(data.get("system_prompt") or f"You are the {clean_name} specialist. Follow Supervisor instructions."),
            "model": str(data.get("model") or ""),
            "temperature": float(data.get("temperature", 0.2)),
            "tools": list(data.get("tools") or ["read_file", "semantic_code_search"]),
            "enabled": bool(data.get("enabled", True)),
            "is_system": False,
            "icon": str(data.get("icon") or "Bot"),
            "color": str(data.get("color") or "#38bdf8")
        }

        self._agents.append(new_agent)
        self._save_agents(self._agents)
        return new_agent

    def update_agent(self, agent_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates fields of an existing agent."""
        for i, a in enumerate(self._agents):
            if a.get("id") == agent_id:
                # Update editable fields
                for k in ["title", "description", "system_prompt", "model", "temperature", "tools", "enabled", "icon", "color"]:
                    if k in updates:
                        a[k] = updates[k]
                if not a.get("is_system") and "name" in updates:
                    clean_name = re.sub(r"[^a-zA-Z0-9_]", "", str(updates["name"]))
                    if clean_name:
                        a["name"] = clean_name
                self._save_agents(self._agents)
                return a
        return None

    def delete_agent(self, agent_id: str) -> bool:
        """Deletes a custom agent (prevents deleting core system agents)."""
        for i, a in enumerate(self._agents):
            if a.get("id") == agent_id:
                if a.get("is_system"):
                    # Cannot delete core system agent; can only disable it
                    a["enabled"] = False
                    self._save_agents(self._agents)
                    return True
                self._agents.pop(i)
                self._save_agents(self._agents)
                return True
        return False

    def reset_to_defaults(self) -> List[Dict[str, Any]]:
        """Restores factory default agents."""
        self._agents = [dict(d) for d in DEFAULT_AGENTS]
        self._save_agents(self._agents)
        return list(self._agents)

agent_manager = AgentManager()
