# Bludai AI Ecosystem ⚡

A premium, hierarchical multi-agent workflow system orchestrated via **LangGraph**, connecting locally through the **9Router** API gateway. Bludai features both an interactive Terminal UI and a beautiful React-based Web Interface.

## Project Architecture (Monorepo)
```text
Bludai/
├── backend/          # FastAPI Server & Python LangGraph Agents (managed via pyproject.toml)
├── frontend/         # React + Vite Web UI (Component-Driven Architecture)
├── docs/             # Documentation and Research Notes
├── skills/           # Drop your custom SKILL.md playbooks here!
└── bludai.bat        # Main entrypoint script
```

## Core Features
- **Dual Interfaces:** Choose between a highly interactive Terminal CLI or a premium dark-mode Web UI.
- **Hierarchical Agents (LangGraph):** Coordinate Developer and Executor worker agents via a supervisor orchestrator node.
- **Dynamic Skills Playbooks:** Add custom behaviors effortlessly by dropping `SKILL.md` files into the root `skills/` directory.
- **9Router Integration:** Automatically fetches and filters available local and remote LLMs directly from your 9Router gateway.
- **Silent Background Launcher:** Launch the entire ecosystem without cluttering your taskbar.

## Setup & Running

1. **Start 9Router:**
   Make sure your local 9Router gateway is running (usually on port 20128).
   ```bash
   9router start
   ```

2. **Launch Bludai:**
   Use the interactive launcher script from the root directory:
   ```powershell
   .\bludai start
   ```
   *You will be presented with an interactive menu to launch the Web UI, Terminal CLI, or both!*

## Administrative Commands (CLI)
When using the Terminal UI, you can use these shortcuts:
- `/exit` - Close the CLI
- `/reset` - Clear the current agent memory
- `/skills` - List available loaded skills
- `/save_skill <name>` - Save the current conversation workflow as a new reusable skill playbook.
