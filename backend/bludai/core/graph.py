from typing import Dict
from langgraph.graph import StateGraph, END
from bludai.core.state import AgentState
from bludai.nodes.supervisor import supervisor_node
from bludai.nodes.worker import make_worker_node
from bludai.core.agent_manager import agent_manager
from bludai.core.memory import get_checkpointer, get_store

_cached_app = None

def build_graph():
    """
    Dynamically compiles the multi-agent graph with all currently enabled workplace specialists.
    """
    workflow = StateGraph(AgentState)
    workflow.add_node("Supervisor", supervisor_node)
    
    enabled_agents = agent_manager.get_enabled_agents()
    route_targets: Dict[str, str] = {"FINISH": END}
    
    for agent in enabled_agents:
        agent_name = agent.get("name")
        if not agent_name or agent_name == "Supervisor":
            continue
        agent_id = agent.get("id", agent_name)
        
        # Add dynamic worker node for this specialist
        workflow.add_node(agent_name, make_worker_node(agent_id))
        # Specialists report back to Supervisor to check off tasks
        workflow.add_edge(agent_name, "Supervisor")
        route_targets[agent_name] = agent_name

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
    def invoke(self, *args, **kwargs):
        return get_graph().invoke(*args, **kwargs)
        
    def stream(self, *args, **kwargs):
        return get_graph().stream(*args, **kwargs)
        
    def astream(self, *args, **kwargs):
        return get_graph().astream(*args, **kwargs)

app = DynamicGraphProxy()
