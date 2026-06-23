import os
from langchain_core.tools import tool
from rich.console import Console

console = Console()

@tool
def create_file(filepath: str, content: str) -> str:
    """Creates a new file at the specified filepath with the given content."""
    try:
        abs_path = os.path.abspath(filepath)
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
        abs_path = os.path.abspath(filepath)
        if not os.path.exists(abs_path):
            return f"Error: File does not exist at {filepath}"
        with open(abs_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
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
        abs_path = os.path.abspath(filepath)
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
