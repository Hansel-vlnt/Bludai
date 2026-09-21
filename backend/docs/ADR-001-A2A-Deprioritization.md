# ADR-001: Deprioritization of Distributed A2A & Structured Task API

## Status
Accepted

## Context
The original project roadmap envisioned Bludai as a distributed multi-agent system where specialists were independently addressable HTTP services. This required:
1. An AgentCard capability registry (for decentralized discovery).
2. Structured Task API endpoints (`/api/tasks/create`, `/api/tasks/{id}`) to pass state payloads over HTTP between decoupled agents.

However, recent development cycles have focused heavily on building a robust, single-process, local user experience (the React Flow topology visualizer, integrated SSE streaming, and SQLite checkpointer). The entire multi-agent orchestration currently lives inside a monolithic, dynamically-compiled `langgraph.graph.StateGraph` (see `backend/bludai/core/graph.py`). Agent configuration is persisted locally via `agent_manager.py` into a flat `.bludai_agents.json` file rather than a networked capability registry.

## Decision
We are explicitly **deprioritizing** native Agent2Agent (A2A) networking (the distributed AgentCard registry and the decoupled `/api/tasks` REST API) for the current architectural cycle.

Instead, we commit to the **Single-Process LangGraph Architecture**:
- All agents (both core and custom) run as local Python functions within the same FastAPI process thread, dynamically injected into the `StateGraph` at runtime via `recompile_graph()`.
- The Supervisor routes tasks using internal graph edge conditions (`AgentState["next"]`) rather than standard HTTP webhooks.
- Tool whitelisting remains strictly enforced server-side inside `execute_tools_node`.

## Consequences
- **Positive:** Massive reduction in infrastructure complexity. We avoid handling distributed consensus, webhook timeouts, and cross-service authentication. State tracing is native to LangGraph.
- **Positive:** Instantaneous state sharing. All agents share the same in-memory `AgentState`, preventing the need for complex serialization across network boundaries.
- **Negative:** Bludai cannot currently orchestrate external agents built on different stacks (e.g., a specialist written in Go running on a separate server). Agents are bound to the local Python runtime.
- **Negative:** The "Task" lifecycle is implicitly tied to a chat session's `/api/chat/stream` cycle rather than existing as an independent, queryable backend entity.

This ADR serves to align the project documentation with the actual shipped code, confirming that the drift from the original A2A plan was a pragmatic scoping decision rather than an oversight.
