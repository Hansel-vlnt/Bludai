import sys
import os
from prompt_toolkit import PromptSession
from prompt_toolkit.history import FileHistory
from prompt_toolkit.styles import Style
from rich.console import Console
from rich.markdown import Markdown

# Add current workspace to path just in case
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from bludai.commands import registry
from bludai.core.llm_client import check_9router_status

console = Console()

BLUDAI_LOGO = """[bold #00E5FF]██████╗ ██╗     ██╗   ██╗██████╗  █████╗ ██╗[/]
[bold #00B0FF]██╔══██╗██║     ██║   ██║██╔══██╗██╔══██╗██║[/]
[#2979FF]██████╔╝██║     ██║   ██║██║  ██║███████║██║[/]
[#3D5AFE]██╔══██╗██║     ██║   ██║██║  ██║██╔══██║██║[/]
[#2962FF]██████╔╝███████╗╚██████╔╝██████╔╝██║  ██║██║[/]
[#1565C0]╚══════╝ ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝[/]"""

prompt_style = Style.from_dict({
    'prompt': 'bold #00B0FF',
    'arrow': 'bold #00E5FF',
})

import uuid

class CLIStateContext:
    """Holds the active session state during CLI lifetime."""
    def __init__(self):
        self.thread_id = uuid.uuid4().hex
        self.checklist = ""
        self.skills = {}
        
    def clear(self):
        self.thread_id = uuid.uuid4().hex
        self.checklist = ""

def print_banner(is_connected: bool, skills_count: int):
    console.print(BLUDAI_LOGO)
    console.print("[bold cyan]====================================================[/]")
    console.print("  [bold white]BLUDAI Agent CLI[/] — Multi-Agent Local Orchestrator")
    
    status_str = "[bold green]Connected[/] [green]●[/]" if is_connected else "[bold red]Offline[/] [red]●[/]"
    console.print(f"  [bold]9Router Gateway:[/] {status_str} (localhost:20128)")
    console.print(f"  [bold]Skills Loaded:[/]   [bold yellow]{skills_count}[/] skills playbooks")
    console.print("  [bold]Type[/] [bold cyan]/help[/] for a list of administrative commands.")
    console.print("[bold cyan]====================================================[/]\n")

def run_cli():
    # 1. Check dependencies and setup skills
    from bludai.core.skills_manager import skills_manager
    skills_manager.load_all_skills()
    skills_count = len(skills_manager.skills)
    
    # 2. Check 9Router status
    is_connected = check_9router_status()
    
    # 3. Print startup banner
    print_banner(is_connected, skills_count)
    
    if not is_connected:
        console.print("[bold yellow]Warning:[/] Could not connect to local 9Router proxy. Please start 9Router with '9router start' before running queries.")
    
    # Initialize CLI state context
    state_ctx = CLIStateContext()
    state_ctx.skills = skills_manager.skills
    
    # Setup prompt history file
    history_file = os.path.expanduser("~/.bludai_history")
    session = PromptSession(history=FileHistory(history_file))
    
    # Lazy load the LangGraph app if needed
    app = None
    
    while True:
        try:
            # Prompt user
            text = session.prompt(
                [('class:prompt', 'bludai'), ('class:arrow', ' ❯ ')],
                style=prompt_style
            )
            text = text.strip()
            if not text:
                continue
                
            # Check for slash commands
            if text.startswith("/"):
                # Handle slash command
                continue_loop = registry.handle(text, state_ctx)
                if not continue_loop:
                    break
                continue
                
            # It's a natural language query - invoke LangGraph flow
            if not is_connected:
                # Re-check status
                is_connected = check_9router_status()
                if not is_connected:
                    console.print("[bold red]Error:[/] 9Router is offline. Run '9router start' to enable queries.")
                    continue
            
            # Lazy load graph to keep startup instant
            if app is None:
                console.print("[dim]Initializing LangGraph Orchestrator...[/]")
                try:
                    from bludai.core.graph import app as compiled_app
                    app = compiled_app
                except Exception as e:
                    console.print(f"[bold red]Failed to load LangGraph:[/] {e}")
                    continue
            
            # Run query
            console.print("[bold cyan]Supervisor node routing task...[/]")
            
            # Run graph with only the new message
            from langchain_core.messages import HumanMessage
            
            inputs = {
                "messages": [HumanMessage(content=text)],
                "checklist": state_ctx.checklist,
                "next": "Supervisor"
            }
            
            try:
                # Run the state graph synchronously with thread_id config
                config = {"configurable": {"thread_id": state_ctx.thread_id}}
                result = app.invoke(inputs, config=config)
                
                # Update our context from the graph run result
                state_ctx.checklist = result.get("checklist", "")
                
                # Fetch final state to get messages for UI
                final_messages = result.get("messages", [])
                
                # Show the final assistant response
                if final_messages:
                    last_msg = final_messages[-1]
                    if last_msg.type == "ai":
                        console.print("\n[bold green]Bludai Assistant:[/]")
                        console.print(Markdown(last_msg.content))
                        console.print()
            except Exception as e:
                console.print(f"[bold red]Error during workflow execution:[/] {e}")
                
        except KeyboardInterrupt:
            # Ctrl+C clears line or resets
            console.print("\n[dim]Session interrupted. Type /exit to quit.[/]")
        except EOFError:
            # Ctrl+D exits
            console.print()
            registry.handle("/exit", state_ctx)
            break
        except Exception as e:
            console.print(f"[bold red]CLI Error:[/] {e}")

if __name__ == "__main__":
    run_cli()
