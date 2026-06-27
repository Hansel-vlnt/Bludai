1. * # Brainstorming & Architecture: Multi-Agent CLI Workflow System ("Bludai Agent CLI")

     This document serves as our initial brainstorming and implementation plan for building a custom, local multi-agent CLI workflow. The system is designed to act as an agentic assistant capable of editing files, creating projects, coordinating subagents, and maintaining memory across sessions.

     ---

     ## Confirmed Choices


     * **Tech Stack:** Python 🐍 + **LangGraph** 🕸️ (For stateful multi-agent orchestration)
     * **API Gateway:** **9Router** 🚦 (Used as a local proxy at `localhost:20128` to handle model routing, rate limits, and RTK token compression for agent tool outputs).
     * **Model:** Any model supported by 9Router (e.g., Gemini 2.5 Flash, Claude 3.5), accessed via standard OpenAI-compatible client.
     * **Memory Strategy:** Temporarily postponed. We will use a simple in-memory `Blackboard` object to hold the state of the current execution session, but designed with future SQLite persistence in mind.
     * **Initial Focus:** Building a robust hierarchical multi-agent loop with a core designed for multi-interface use (CLI first, messaging later).

     ---

     ## Architectural Blueprint (Bludai x 9Router x Hermes Concepts)

     Below is the updated design incorporating a headless core, slash command routing, and 9Router gateway:

     ```mermaid
     graph TD
         User([User Input]) --> Interface[CLI / Telegram / TUI]
       
         Interface --> Router{Input Router}
         Router -->|Starts with '/'| SlashCommands[Slash Command Executor]
         Router -->|Natural Language| LangGraph[LangGraph Orchestrator]
       
         subgraph LangGraph StateGraph
             State[(In-Memory State: messages, checklist)]
             Supervisor[Manager Node] <-->|Reads/Writes| State
           
             Supervisor -->|Delegates| Developer[Developer Node]
             Supervisor -->|Delegates| Executor[Executor Node]
           
             Developer -->|Result| Supervisor
             Executor -->|Result| Supervisor
         end
       
         LangGraph -->|LLM API Calls| 9Router[9Router Proxy :20128]
         9Router -->|RTK Compression & Fallbacks| UpstreamLLMs[(Gemini / Claude / etc.)]
       
         Developer -->|FS Tools| Files[(Local FS)]
         Executor -->|Shell Tools| Terminal[(Terminal)]
     ```
     ---

     ## Component Details & Hermes Insights

     ### 1. The Gateway Layer (9Router)

     * Instead of hardcoding Gemini or Anthropic SDKs, all LangGraph LLM nodes will initialize a generic OpenAI client pointing to `http://localhost:20128/v1`.
     * This instantly gives us **RTK Token Compression** (saving 20-40% tokens on large tool outputs like `git diff` or `tree`) and **Tiered Fallbacks**.

     ### 2. Slash Command Routing (Hermes Concept)

     * User inputs starting with `/` (e.g., `/reset`, `/model`) bypass the LLM entirely.
     * This prevents prompt cache invalidation and saves tokens for administrative actions.

     ### 3. The State & Supervisor

     * **State:** A `TypedDict` containing conversation history, active tasks, and context.
     * **Supervisor:** The LLM node that analyzes the state and decides whether to act, delegate to the Developer (file changes), delegate to the Executor (commands), or respond to the user.

     ### 4. Extensibility (Hermes "Narrow Waist" Rule)

     * The core tools (read/write file, run command) must be kept minimal.
     * New capabilities should be added as "Skills" (system prompt additions) or "Plugins" rather than bloating the core LLM tool schema.

     ---

     ## Detailed Component Specifications

     To ensure we have a complete blueprint before writing any code, here are the exact mechanics for the core modules:

     ### A. The Shared State (`core/state.py`)

     ```python
     from typing import TypedDict, Annotated, List
     from langchain_core.messages import BaseMessage
     import operator

     class AgentState(TypedDict):
         # The full conversation and tool execution history
         messages: Annotated[List[BaseMessage], operator.add]
         # The active checklist/plan managed by the Supervisor
         checklist: str
         # The next node to execute ("Developer", "Executor", or "FINISH")
         next: str
     ```
     ### B. The LLM Nodes (`nodes/*.py`)

     1. **Supervisor Node (`supervisor.py`)**

        * **Role:** Analyzes the user's request and the current `checklist`. Decides who works next.
        * **Output:** It uses OpenAI's `StructuredOutput` (via Pydantic) to return exactly: `{"next": "Developer" | "Executor" | "FINISH", "updated_checklist": "..."}`.
        * **Prompt:** "You are the orchestrator. Create a checklist for the user's request. Delegate file changes to Developer, and terminal commands to Executor. When the checklist is complete, return FINISH."
     2. **Developer Node (`developer.py`)**

        * **Role:** Writes and edits code.
        * **Tools Equipped:** `create_file`, `read_file`, `replace_content`.
        * **Prompt:** "You are an expert developer. You fulfill the tasks given by the supervisor. Write clean, bug-free code. Return control when your specific file task is done."
     3. **Executor Node (`executor.py`)**

        * **Role:** Runs tests, installs dependencies, runs shell commands.
        * **Tools Equipped:** `run_terminal_command`.
        * **Prompt:** "You are a terminal executor. Run the necessary commands in the workspace. Return the output. Do NOT write code manually, rely on the Developer for that."

     ### C. The LangGraph Routing (`core/graph.py`)

     ```python
     from langgraph.graph import StateGraph, END

     workflow = StateGraph(AgentState)
     workflow.add_node("Supervisor", supervisor_node)
     workflow.add_node("Developer", developer_node)
     workflow.add_node("Executor", executor_node)

     # The supervisor decides the next step
     workflow.add_conditional_edges(
         "Supervisor",
         lambda x: x["next"],
         {"Developer": "Developer", "Executor": "Executor", "FINISH": END}
     )

     # Workers always report back to the supervisor
     workflow.add_edge("Developer", "Supervisor")
     workflow.add_edge("Executor", "Supervisor")

     workflow.set_entry_point("Supervisor")
     app = workflow.compile()
     ```
     ### D. Slash Commands (`commands.py`)

     We will implement a basic dictionary-based registry for slash commands that bypass the LangGraph loop:

     * `/exit` or `/quit`: Cleanly exits the CLI.
     * `/reset`: Clears the in-memory `AgentState` (starts a new session).
     * `/save_skill <name>`: Triggers the Skill Extractor to convert the current chat history into a reusable skill.

     ### E. The Skills Engine & Memory Extraction (Hermes Concept)

     To keep the core system ("Narrow Waist") clean, complex workflows will be stored as procedural memory in markdown files, exactly like Hermes.

     1. **Skill Format:** Skills live in `bludai-cli/skills/<skill_name>/SKILL.md`. They contain YAML frontmatter (name, description) and a Markdown body (instructions, prompts, tools needed).
     2. **Dynamic Loading:** The `skills_manager.py` reads these files at startup. The Supervisor can dynamically inject a skill's Markdown body into the Developer's prompt based on the user's intent.
     3. **Chat-to-Memory Extraction:** We will implement an `Extractor Node` (or subagent). When the user types `/save_skill deployment`, the Extractor reads the entire `AgentState.messages` history, distills the successful steps taken, and writes a new `SKILL.md` to disk. This gives the agent *independent procedural memory* from past chats.

     ---

     ## Proposed Project Structure

     We will organize the Python codebase with a clean, modular structure utilizing LangGraph:

     ```
     bludai-cli/
     ├── bludai/
     │   ├── __init__.py
     │   ├── cli.py                  # Interactive terminal UI (Rich/Prompt Toolkit)
     │   ├── commands.py             # Slash command registry (/reset, /help)
     │   ├── core/
     │   │   ├── graph.py            # LangGraph StateGraph definition
     │   │   ├── state.py            # TypedDict for shared state
     │   │   ├── llm_client.py       # Standardized 9Router client initialization
     │   │   └── skills_manager.py   # Loads SKILL.md files and extracts chat to memory
     │   ├── nodes/
     │   │   ├── supervisor.py       # Manager routing logic
     │   │   ├── developer.py        # File manipulation agent
     │   │   ├── executor.py         # Terminal execution agent
     │   │   └── extractor.py        # Converts chat history into new SKILL.md
     │   ├── tools/
     │   │   ├── file_tools.py       # Read/Write/Patch tools
     │   │   └── shell_tools.py      # Subprocess execution tools
     │   └── skills/                 # Procedural Memory Directory
     │       └── example_skill/
     │           └── SKILL.md        # YAML frontmatter + Markdown instructions
     ├── requirements.txt            # (langgraph, openai, rich, pyyaml, pydantic)
     └── README.md
     ```
     ---

     ## Verification Plan

     ### Manual Verification

     1. **File & Folder Creation Test:**
        * Ask the CLI: *"Buat folder baru bernama 'test_project' lalu buat file Python sederhana di dalamnya."*
        * Verify the directory structure and file contents are created correctly on disk.
     2. **Cooperative Workflow Test:**
        * Ask the CLI: *"Tulis kode untuk bubble sort di main.py, lalu suruh agen penguji (tester) untuk menjalankan unit test di file test_main.py."*
        * Verify that:
          * Manager creates a plan.
          * Developer agent writes `main.py`.
          * Developer/Tester agent writes `test_main.py`.
          * Executor agent runs `pytest` or `python test_main.py`.
          * Manager inspects and confirms success.

---

## 🛑 Audit & Architectural Revisions (Phase 1)

Based on our recent implementation progress and a deep-dive review against our reference research, we have successfully implemented the core structure. However, there are critical gaps that we must address to ensure enterprise-grade reliability and security.

### Audit Findings:
- **✅ Codebase Completeness Check:** The foundational CLI structure (`cli.py`), core loop (`graph.py`), and nodes (`supervisor.py`, `developer.py`, `executor.py`) have been correctly implemented.
- **❌ Security Gap (Trust-Vulnerability Paradox):** Our initial plan omitted a critical security vulnerability detailed in the research: the **Trust-Vulnerability Paradox (TVP)**. As agents delegate tasks, they blindly trust each other.
- **❌ Observability Gap:** The plan currently relies entirely on `cli.py` prints. We need step-level state logs for debugging failure attributions.

### Proposed Revisions
#### 1. [NEW] Guardian-Agent / MNI-Gate (`core/guardian.py`)
- **Role:** A security middleware node acting as the Minimum Necessary Information (MNI) Gate. 
#### 2. [NEW] Step-level Traceability Logger (`core/logger.py`)
- **Role:** An independent JSONL logging system that writes every `AgentState` transition to disk.

---

## 🎯 Phase 2: Multi-Model Role Assignment

Based on user feedback, relying on a single `DEFAULT_MODEL` for all agents is inefficient. Complex tasks (Supervisor) need highly capable models, while repetitive or specific tasks (Developer/Executor) can use specialized or faster models.

### The Feature Plan:
We will build a dynamic **Role Assignment System** inside the CLI that lets the user assign models to specific agents.

#### 1. [NEW] Models Manager (`core/models_manager.py`)
- A new module that reads from a persistent `roles.json` file.
- **Roles:** `Supervisor`, `Developer`, `Executor`, `Extractor`.

#### 2. [MODIFY] LLM Client Initialization (`core/llm_client.py`)
- Update `get_llm_client(role="default")` to accept a role parameter.
- It will query `models_manager.py` to see if a custom model is assigned to that role. If not, it falls back to the default model.

#### 3. [MODIFY] LangGraph Nodes
- Update `supervisor_node`, `developer_node`, and `executor_node` to pass their respective roles when calling `get_llm_client()`.

#### 4. [NEW] `/models` Slash Command (`commands.py`)
- **`/models`**: Lists all connected models from 9Router and displays the current role assignments.
- **`/models set <Role> <ModelName>`**: Allows the user to assign a specific model to a role directly from the CLI.
