from typing import Dict
from langgraph.graph import StateGraph, END
from langchain_core.messages import AIMessage
from bludai.core.state import AgentState
from bludai.nodes.supervisor import supervisor_node
from bludai.nodes.worker import make_worker_node, execute_tools_node
from bludai.core.agent_manager import agent_manager
from bludai.core.memory import get_checkpointer, get_store

_cached_app = None

def make_worker_router(agent_name: str):
    def worker_router(state: AgentState) -> str:
        messages = state.get("messages", [])
        if messages:
            last = messages[-1]
            if getattr(last, "tool_calls", None):
                return "tools"
        return "Supervisor"
    return worker_router

def route_tools(state: AgentState) -> str:
    messages = state.get("messages", [])
    for m in reversed(messages):
        if isinstance(m, AIMessage) and getattr(m, "tool_calls", None):
            agent = m.additional_kwargs.get("agent")
            if agent:
                return agent
    return "Supervisor"

def build_graph():
    """
    Dynamically compiles the multi-agent graph with all currently enabled workplace specialists
    and a centralized tool execution node supporting LangGraph native interrupts.
    """
    workflow = StateGraph(AgentState)
    workflow.add_node("Supervisor", supervisor_node)
    workflow.add_node("tools", execute_tools_node)
    
    enabled_agents = agent_manager.get_enabled_agents()
    route_targets: Dict[str, str] = {"FINISH": END}
    tools_route_targets: Dict[str, str] = {"Supervisor": "Supervisor"}
    
    for agent in enabled_agents:
        agent_name = agent.get("name")
        if not agent_name or agent_name == "Supervisor":
            continue
        agent_id = agent.get("id", agent_name)
        
        # Add dynamic worker node for this specialist
        workflow.add_node(agent_name, make_worker_node(agent_id))
        
        # Specialist routes to tools if tool_calls requested, otherwise back to Supervisor
        workflow.add_conditional_edges(
            agent_name,
            make_worker_router(agent_name),
            {"tools": "tools", "Supervisor": "Supervisor"}
        )
        
        route_targets[agent_name] = agent_name
        tools_route_targets[agent_name] = agent_name

    # Tools route back to the requesting specialist
    workflow.add_conditional_edges(
        "tools",
        route_tools,
        tools_route_targets
    )

    def route_supervisor(state: AgentState) -> str:
        next_node = state.get("next", "FINISH")
        if isinstance(next_node, str):
            target = next_node.strip()
            if target in route_targets:
                return target
            # Case-insensitive fallback
            target_lower = target.lower()
            for t in route_targets:
                if t.lower() == target_lower:
                    return t
        return "FINISH"

    workflow.add_conditional_edges(
        "Supervisor",
        route_supervisor,
        route_targets
    )

    workflow.set_entry_point("Supervisor")
    return workflow.compile(
        checkpointer=get_checkpointer(),
        store=get_store()
    )

def get_graph():
    global _cached_app
    if _cached_app is None:
        _cached_app = build_graph()
    return _cached_app

def recompile_graph():
    """Recompiles the graph whenever workplace roles or tool bindings are modified."""
    global _cached_app
    _cached_app = build_graph()
    return _cached_app

class DynamicGraphProxy:
    """Proxy object ensuring callers always execute against the latest dynamically compiled graph."""
    def __getattr__(self, name):
        return getattr(get_graph(), name)

    def invoke(self, *args, **kwargs):
        return get_graph().invoke(*args, **kwargs)
        
    def stream(self, *args, **kwargs):
        return get_graph().stream(*args, **kwargs)
        
    def astream(self, *args, **kwargs):
        return get_graph().astream(*args, **kwargs)

app = DynamicGraphProxy()

