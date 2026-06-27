from rich.console import Console

console = Console()

class CommandRegistry:
    def __init__(self):
        self.commands = {}
        
    def register(self, name, description):
        def decorator(func):
            self.commands[f"/{name}"] = {
                "func": func,
                "description": description
            }
            return func
        return decorator

    def handle(self, text, state_ctx):
        parts = text.strip().split(maxsplit=1)
        cmd = parts[0]
        args = parts[1] if len(parts) > 1 else ""
        
        if cmd in self.commands:
            return self.commands[cmd]["func"](args, state_ctx)
        else:
            console.print(f"[bold red]Error:[/] Unknown command '{cmd}'. Type [bold cyan]/help[/] for a list of commands.")
            return True

registry = CommandRegistry()

@registry.register("exit", "Cleanly exit the Bludai CLI.")
def cmd_exit(args, state_ctx):
    console.print("[bold yellow]Goodbye from Bludai Agent CLI![/]")
    return False  # Return False to terminate the chat loop

@registry.register("quit", "Cleanly exit the Bludai CLI (alias for /exit).")
def cmd_quit(args, state_ctx):
    return cmd_exit(args, state_ctx)

@registry.register("help", "Show this help menu.")
def cmd_help(args, state_ctx):
    console.print("\n[bold cyan]=== Bludai Agent CLI Help ===[/]")
    for cmd, info in registry.commands.items():
        console.print(f"  [bold green]{cmd:<15}[/] {info['description']}")
    console.print()
    return True

@registry.register("reset", "Reset the conversation state and start a new session.")
def cmd_reset(args, state_ctx):
    state_ctx.clear()
    console.print("[bold green]Success:[/] Conversation state has been reset.")
    return True

@registry.register("skills", "List all currently loaded/available skills.")
def cmd_skills(args, state_ctx):
    try:
        from bludai.core.skills_manager import skills_manager
        loaded = skills_manager.list_skills()
        if not loaded:
            console.print("[yellow]No skills loaded. Add skill playbooks to the skills/ directory.[/]")
        else:
            console.print("\n[bold cyan]=== Loaded Skills ===[/]")
            for name, desc in loaded.items():
                console.print(f"  [bold yellow]{name:<15}[/] {desc}")
            console.print()
    except Exception as e:
        console.print(f"[bold red]Error listing skills:[/] {e}")
    return True

@registry.register("save_skill", "Save the current conversation history as a new skill: /save_skill <name>")
def cmd_save_skill(args, state_ctx):
    name = args.strip()
    if not name:
        console.print("[bold red]Error:[/] Please specify a name for the skill, e.g. [bold cyan]/save_skill my_cool_skill[/]")
        return True
    
    # Trigger the extractor logic
    try:
        from bludai.nodes.extractor import extract_and_save_skill
        success, message = extract_and_save_skill(name, state_ctx)
        if success:
            console.print(f"[bold green]Success:[/] {message}")
        else:
            console.print(f"[bold red]Error saving skill:[/] {message}")
    except Exception as e:
        console.print(f"[bold red]Exception saving skill:[/] {e}")
    return True

@registry.register("models", "List or set connected models. Usage: /models [set <Role> <ModelName>]")
def cmd_models(args, state_ctx):
    from bludai.core.models_manager import models_manager
    
    parts = args.strip().split()
    if not parts:
        # Just list models and roles
        console.print("\n[bold cyan]=== Connected Models (from 9Router) ===[/]")
        available = models_manager.get_available_models()
        if available:
            for m in available:
                console.print(f"  - [green]{m}[/]")
        else:
            console.print("  [yellow]No models found or 9Router not reachable.[/]")
            
        console.print("\n[bold cyan]=== Current Role Assignments ===[/]")
        roles = models_manager.get_all_roles()
        
        # We ensure core roles are always displayed, plus any custom ones created
        core_roles = ["Supervisor", "Developer", "Executor", "Extractor"]
        all_roles_to_display = set(core_roles + list(roles.keys()))
        
        for r in sorted(all_roles_to_display):
            assigned = roles.get(r, "[dim]Default[/]")
            console.print(f"  [bold yellow]{r:<20}[/] {assigned}")
        console.print()
        return True
        
    if parts[0] == "set" and len(parts) >= 3:
        role = parts[1]
        model_name = parts[2]
            
        models_manager.set_model_for_role(role, model_name)
        console.print(f"[bold green]Success:[/] Assigned '{model_name}' to role '{role}'.")
        return True
        
    console.print("[bold red]Usage:[/] /models [set <Role> <ModelName>]")
    return True

@registry.register("ask", "Ask a specific role directly (bypasses agent workflow). Usage: /ask <Role> <Message>")
def cmd_ask(args, state_ctx):
    parts = args.strip().split(maxsplit=1)
    if len(parts) < 2:
        console.print("[bold red]Usage:[/] /ask <Role> <Message>")
        return True
        
    role = parts[0]
    question = parts[1]
    
    from bludai.core.llm_client import get_llm_client
    from langchain_core.messages import HumanMessage
    
    console.print(f"[dim]Calling {role}...[/]")
    try:
        llm = get_llm_client(role=role)
        response = llm.invoke([HumanMessage(content=question)])
        console.print(f"\n[bold magenta][{role}]:[/] {response.content}\n")
    except Exception as e:
        console.print(f"[bold red]Error communicating with {role}:[/] {e}")
        
    return True
