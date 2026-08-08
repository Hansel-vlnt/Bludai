import os
import sys
import webbrowser
import subprocess
from rich.console import Console
import questionary
from questionary import Style

CREATE_NO_WINDOW = 0x08000000

console = Console()

custom_style = Style([
    ('qmark', 'fg:#ff6e4a bold'),
    ('question', 'bold'),
    ('answer', 'fg:#4ade80 bold'),
    ('pointer', 'fg:#ff6e4a bold'),
    ('highlighted', 'fg:#ff6e4a bold'),
    ('selected', 'fg:#4ade80'),
    ('separator', 'fg:#cc5454'),
    ('instruction', ''),
    ('text', ''),
])

def print_banner():
    os.system("cls" if os.name == "nt" else "clear")
    console.print("[bold #ff6e4a]========================================================[/]")
    console.print("  [bold white]Bludai Interactive Launcher[/] (v1.0.0)")
    console.print("  🚀 [dim white]Web UI:[/] [bold #4ade80]http://localhost:5173[/]")
    console.print("  🚀 [dim white]API Server:[/] [bold #4ade80]http://localhost:8000[/]")
    console.print("[bold #ff6e4a]========================================================[/]\n")

def run():
    print_banner()
    
    choice = questionary.select(
        "",
        choices=[
            questionary.Choice("Web UI (Open in Browser)", "web"),
            questionary.Choice("Terminal UI (Interactive CLI)", "cli"),
            questionary.Choice("Start All (Web UI + CLI)", "all"),
            questionary.Choice("Exit", "exit")
        ],
        style=custom_style,
        qmark="",
        pointer=">"
    ).ask()
    
    if choice == "web":
        console.print("\n[bold green]Starting Backend API in background...[/]")
        subprocess.Popen(
            [r".venv\Scripts\python.exe", "-m", "uvicorn", "bludai.api.server:app", "--reload"],
            cwd="backend",
            creationflags=CREATE_NO_WINDOW
        )
        
        console.print("[bold green]Starting Web UI in background...[/]")
        subprocess.Popen(
            ["npm.cmd", "run", "dev"],
            cwd="frontend",
            creationflags=CREATE_NO_WINDOW,
            shell=True
        )
        
        console.print("[bold cyan]Opening http://localhost:5173 in your browser...[/]")
        webbrowser.open("http://localhost:5173")
        
    elif choice == "cli":
        os.system("cd backend && .venv\\Scripts\\python -m bludai.cli")
        
    elif choice == "all":
        console.print("\n[bold green]Starting Backend API in background...[/]")
        subprocess.Popen(
            [r".venv\Scripts\python.exe", "-m", "uvicorn", "bludai.api.server:app", "--reload"],
            cwd="backend",
            creationflags=CREATE_NO_WINDOW
        )
        
        console.print("[bold green]Starting Web UI in background...[/]")
        subprocess.Popen(
            ["npm.cmd", "run", "dev"],
            cwd="frontend",
            creationflags=CREATE_NO_WINDOW,
            shell=True
        )
        
        webbrowser.open("http://localhost:5173")
        
        os.system("cd backend && .venv\\Scripts\\python -m bludai.cli")
        
    else:
        sys.exit(0)

if __name__ == "__main__":
    run()
