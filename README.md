# Bludai Agent CLI ⚡

A custom, hierarchical multi-agent CLI workflow system orchestrated via LangGraph, connecting locally through the **9Router** API gateway, and adopting **Hermes** slash commands and dynamic skill-playbook extraction.

## Features
- **Hierarchical Graph (LangGraph):** Coordinate Developer and Executor worker agents via a supervisor orchestrator node.
- **9Router Integration:** Local proxy with fallback routing, cost controls, and token compression.
- **Slash Commands:** `/exit`, `/reset`, `/skills`, `/save_skill` administrative shortcuts.
- **Skills Playbooks (Hermes-inspired):** Load instructions dynamically, and save successful workflows to disk as new skills using `/save_skill <name>`.
- **Interactive TUI:** Bold CLI styling with autocomplete and command prompt banner.

## Setup & Running

1. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Start 9Router:**
   Make sure 9Router is running locally:
   ```bash
   9router start
   ```

3. **Start Bludai CLI:**
   ```bash
   python -m bludai.cli
   ```
