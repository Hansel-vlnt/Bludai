import subprocess
import os
from langchain_core.tools import tool
from rich.console import Console
from langgraph.types import interrupt
from bludai.core.settings_manager import settings_manager

console = Console()

@tool
def run_terminal_command(command: str) -> str:
    """
    Runs a shell command on the host operating system.
    In supervised execution mode, prompts the user for approval via LangGraph interrupt.
    In autonomous mode, executes directly.
    """
    settings = settings_manager.get_settings()
    execution_mode = settings.get("execution_mode", "auto")

    console.print(f"\n[bold cyan]⚡ Terminal Command Requested:[/] [bold yellow]{command}[/]")

    # In supervised mode, require confirmation via LangGraph interrupt
    if execution_mode == "supervised":
        console.print("[bold yellow]⚠️ Human-In-The-Loop:[/] Pausing execution for user approval...")
        approval = interrupt({
            "type": "terminal_approval",
            "command": command,
            "description": f"Agent is requesting to execute: {command}"
        })

        # Validate approval response from resume payload
        is_approved = False
        if isinstance(approval, dict):
            is_approved = bool(approval.get("approved") or approval.get("action") == "approve")
        elif isinstance(approval, bool):
            is_approved = approval

        if not is_approved:
            console.print("[bold red]Denied:[/] Command execution rejected by user.")
            return f"Execution Error: User rejected execution of command: {command}"
        
        console.print("[bold green]Approved:[/] User granted permission to execute command.")

    console.print(f"[bold green]Running command...[/]")
    try:
        # Run command in subshell
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=120
        )
        
        output = []
        if result.stdout:
            output.append(f"--- STDOUT ---\n{result.stdout}")
        if result.stderr:
            output.append(f"--- STDERR ---\n{result.stderr}")
            
        output_str = "\n".join(output)
        if not output_str:
            output_str = "Command finished with no output."
            
        console.print(f"[bold green]Command completed (code {result.returncode})[/]")
        return f"Exit Code: {result.returncode}\n{output_str}"
        
    except subprocess.TimeoutExpired:
        return "Error: Command timed out after 120 seconds."
    except Exception as e:
        return f"Error executing command: {e}"

shell_tools = [run_terminal_command]
