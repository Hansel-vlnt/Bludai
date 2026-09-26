import os
from langchain_core.tools import tool
from rich.console import Console

console = Console()

from evals.path_sanitizer import safe_join_and_resolve
from bludai.core.workspace_manager import workspace_manager

def _enforce_jail(filepath: str) -> str:
    try:
        active_root = workspace_manager.get_active_path()
        # safe_join_and_resolve handles all path traversal defenses including bounds checking
        abs_path = safe_join_and_resolve(active_root, filepath)
        return str(abs_path)
    except Exception as e:
        raise PermissionError(f"Path traversal blocked: {e}")

@tool
def create_file(filepath: str, content: str) -> str:
    """Creates a new file at the specified filepath with the given content."""
    try:
        abs_path = _enforce_jail(filepath)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, 'w', encoding='utf-8') as f:
            f.write(content)
        console.print(f"[bold green]Developer Node Tool:[/] Created file at [cyan]{abs_path}[/]")
        return f"Successfully created file at {filepath}"
    except Exception as e:
        return f"Error creating file: {e}"

@tool
def read_file(filepath: str) -> str:
    """Reads the contents of a file at the specified filepath."""
    try:
        abs_path = _enforce_jail(filepath)
        if not os.path.exists(abs_path):
            return f"Error: File does not exist at {filepath}"
        with open(abs_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        if len(content) > 10000:
            warning = "\n... [WARNING: File content exceeded 10,000 characters and was truncated. Please use line-range inspection if available.] ...\n"
            content = content[:10000] + warning
            
        return content
    except Exception as e:
        return f"Error reading file: {e}"

@tool
def replace_content(filepath: str, old_content: str, new_content: str) -> str:
    """
    Replaces a specific block of text (old_content) with new text (new_content) in the specified file.
    The old_content must match exactly.
    """
    try:
        abs_path = _enforce_jail(filepath)
        if not os.path.exists(abs_path):
            return f"Error: File does not exist at {filepath}"
            
        with open(abs_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        if old_content not in content:
            return f"Error: The target text to replace was not found in the file. Make sure of exact whitespace match."
            
        updated_content = content.replace(old_content, new_content, 1)
        with open(abs_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)
            
        console.print(f"[bold green]Developer Node Tool:[/] Modified file [cyan]{abs_path}[/]")
        return f"Successfully updated file {filepath}"
    except Exception as e:
        return f"Error modifying file: {e}"

file_tools = [create_file, read_file, replace_content]
