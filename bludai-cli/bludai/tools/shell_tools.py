import subprocess
import os
from langchain_core.tools import tool
from rich.console import Console

console = Console()

@tool
def run_terminal_command(command: str) -> str:
    """
    Runs a shell command on the host operating system.
    All commands require manual user confirmation to execute.
    """
    console.print(f"\n[bold red]⚠️ Security Alert:[/] Agent is requesting to execute command:")
    console.print(f"  [bold yellow]{command}[/]\n")
    
    # Prompt the user for confirmation
    confirm = input("Confirm execution? (y/n) [n]: ").strip().lower()
    if confirm != 'y' and confirm != 'yes':
        console.print("[bold red]Denied:[/] Command execution rejected by user.")
        return "Execution Error: Rejected by user."
        
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
