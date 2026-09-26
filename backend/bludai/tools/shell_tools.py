import subprocess
import os
from langchain_core.tools import tool
from rich.console import Console
from langgraph.types import interrupt
from bludai.core.settings_manager import settings_manager
from bludai.core.workspace_manager import workspace_manager

console = Console()

@tool
def run_terminal_command(command: str) -> str:
    """
    Runs a shell command on the host operating system.
    In supervised execution mode, prompts the user for approval via LangGraph interrupt.
    In autonomous mode, executes directly in the active project workspace directory.
    """
    settings = settings_manager.get_settings()
    execution_mode = settings.get("execution_mode", "auto")
    cwd = workspace_manager.get_active_path()

    try:
        console.print(f"\n[bold cyan]>> Terminal Command Requested:[/] [bold yellow]{command}[/] in [cyan]{cwd}[/]")
    except Exception:
        pass

    # In supervised mode, require confirmation via LangGraph interrupt
    if execution_mode == "supervised":
        try:
            console.print("[bold yellow]Human-In-The-Loop:[/] Pausing execution for user approval...")
        except Exception:
            pass
        approval = interrupt({
            "type": "terminal_approval",
            "command": command,
            "cwd": cwd,
            "description": f"Agent is requesting to execute: {command} in {cwd}"
        })

        # Validate approval response from resume payload
        is_approved = False
        if isinstance(approval, dict):
            is_approved = bool(approval.get("approved") or approval.get("action") == "approve")
        elif isinstance(approval, bool):
            is_approved = approval

        if not is_approved:
            try:
                console.print("[bold red]Denied:[/] Command execution rejected by user.")
            except Exception:
                pass
            return f"Execution Error: User rejected execution of command: {command}"
        
        try:
            console.print("[bold green]Approved:[/] User granted permission to execute command.")
        except Exception:
            pass

    try:
        console.print(f"[bold green]Running command in {cwd}...[/]")
    except Exception:
        pass

    try:
        # Run command in subshell with stdin closed to prevent hanging on interactive prompts (e.g. Windows 'date')
        result = subprocess.run(
            command,
            cwd=cwd,
            shell=True,
            capture_output=True,
            text=True,
            stdin=subprocess.DEVNULL,
            timeout=120
        )
        
        output = []
        if result.stdout:
            output.append(f"--- STDOUT ---\n{result.stdout}")
        if result.stderr:
            output.append(f"--- STDERR ---\n{result.stderr}")
            
        output_str = "\n".join(output)
        if len(output_str) > 2500:
            total_bytes = len(output_str.encode('utf-8'))
            output_str = output_str[:1500] + f"\n... [Output truncated: {total_bytes} bytes reduced to 2,500 chars to protect context window] ...\n" + output_str[-1000:]
            
        if not output_str:
            output_str = "Command finished with no output."
            
        try:
            console.print(f"[bold green]Command completed (code {result.returncode})[/]")
        except Exception:
            pass
        return f"Exit Code: {result.returncode}\n{output_str}"
        
    except subprocess.TimeoutExpired:
        return "Error: Command timed out after 120 seconds."
    except Exception as e:
        return f"Error executing command: {e}"

shell_tools = [run_terminal_command]
