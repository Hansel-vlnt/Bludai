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

# Resolve directories dynamically
# bludai package is inside backend/bludai
BLUDAI_PKG_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(BLUDAI_PKG_DIR, ".."))
ROOT_DIR = os.path.abspath(os.path.join(BACKEND_DIR, ".."))
WEB_UI_DIR = os.path.join(ROOT_DIR, "web-ui")
PYTHON_EXE = sys.executable or (os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe") if os.name == "nt" else os.path.join(BACKEND_DIR, ".venv", "bin", "python"))

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
        "Select interface to launch:",
        choices=[
            questionary.Choice("Web UI (Open in Browser)", "web"),
            questionary.Choice("Terminal UI (Interactive CLI)", "cli"),
            questionary.Choice("Start All (Web UI + CLI)", "all"),
            questionary.Choice("Exit", "exit")
        ],
        style=custom_style,
        qmark="?",
        pointer=">"
    ).ask()
    
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    
    if choice == "web":
        console.print("\n[bold green]Starting Backend API in background...[/]")
        subprocess.Popen(
            [PYTHON_EXE, "-m", "uvicorn", "bludai.api.server:app", "--reload"],
            cwd=BACKEND_DIR,
            creationflags=CREATE_NO_WINDOW if os.name == "nt" else 0
        )
        
        console.print("[bold green]Starting Web UI in background...[/]")
        subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=WEB_UI_DIR,
            creationflags=CREATE_NO_WINDOW if os.name == "nt" else 0,
            shell=True
        )
        
        console.print("[bold cyan]Opening http://localhost:5173 in your browser...[/]")
        webbrowser.open("http://localhost:5173")
        
    elif choice == "cli":
        from bludai.cli import run_cli
        run_cli()
        
    elif choice == "all":
        console.print("\n[bold green]Starting Backend API in background...[/]")
        subprocess.Popen(
            [PYTHON_EXE, "-m", "uvicorn", "bludai.api.server:app", "--reload"],
            cwd=BACKEND_DIR,
            creationflags=CREATE_NO_WINDOW if os.name == "nt" else 0
        )
        
        console.print("[bold green]Starting Web UI in background...[/]")
        subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=WEB_UI_DIR,
            creationflags=CREATE_NO_WINDOW if os.name == "nt" else 0,
            shell=True
        )
        
        webbrowser.open("http://localhost:5173")
        
        from bludai.cli import run_cli
        run_cli()
        
    else:
        sys.exit(0)

if __name__ == "__main__":
    run()
