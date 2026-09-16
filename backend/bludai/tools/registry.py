from typing import List, Dict, Any, Optional
from langchain_core.tools import BaseTool

from bludai.tools.file_tools import create_file, read_file, replace_content
from bludai.tools.shell_tools import run_terminal_command
from bludai.tools.vector_tools import semantic_code_search, index_project_codebase
from bludai.tools.web_tools import web_search

ALL_TOOLS: Dict[str, BaseTool] = {
    "create_file": create_file,
    "read_file": read_file,
    "replace_content": replace_content,
    "run_terminal_command": run_terminal_command,
    "semantic_code_search": semantic_code_search,
    "index_project_codebase": index_project_codebase,
    "web_search": web_search,
}

TOOL_METADATA: List[Dict[str, Any]] = [
    {
        "id": "read_file",
        "name": "Read File",
        "category": "File Operations",
        "description": "Read file contents from the project directory.",
        "risk": "low"
    },
    {
        "id": "create_file",
        "name": "Create File",
        "category": "File Operations",
        "description": "Create new files with designated code content.",
        "risk": "medium"
    },
    {
        "id": "replace_content",
        "name": "Edit / Replace File",
        "category": "File Operations",
        "description": "Precise search-and-replace edits in existing files.",
        "risk": "medium"
    },
    {
        "id": "semantic_code_search",
        "name": "Semantic Code Search",
        "category": "Codebase Search",
        "description": "Find components, functions, or files using vector embeddings.",
        "risk": "low"
    },
    {
        "id": "index_project_codebase",
        "name": "Index Codebase",
        "category": "Codebase Search",
        "description": "Re-index project files into ChromaDB vector memory.",
        "risk": "low"
    },
    {
        "id": "run_terminal_command",
        "name": "Terminal Command Execution",
        "category": "Terminal",
        "description": "Execute terminal commands, tests, builds, and scripts.",
        "risk": "high"
    },
    {
        "id": "web_search",
        "name": "Live Web Search",
        "category": "Internet Search",
        "description": "Search the live web in real-time for current news, facts, and documentation.",
        "risk": "low"
    }
]

def get_tool(tool_id: str) -> Optional[BaseTool]:
    """Resolves a tool ID to its callable BaseTool instance."""
    return ALL_TOOLS.get(tool_id)

def resolve_tools(tool_ids: List[str]) -> List[BaseTool]:
    """Resolves a list of tool IDs into a list of executable BaseTool instances."""
    resolved = []
    for tid in tool_ids:
        t = ALL_TOOLS.get(tid)
        if t:
            resolved.append(t)
    return resolved

def list_available_tools() -> List[Dict[str, Any]]:
    """Returns metadata for all registered tools."""
    return list(TOOL_METADATA)
