from langgraph.graph import StateGraph, END
from bludai.core.state import AgentState
from bludai.nodes.supervisor import supervisor_node
from bludai.nodes.developer import developer_node
from bludai.nodes.executor import executor_node
from bludai.core.memory import get_checkpointer, get_store
# Initialize graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("Supervisor", supervisor_node)
workflow.add_node("Developer", developer_node)
workflow.add_node("Executor", executor_node)

def route_supervisor(state: AgentState) -> str:
    next_node = state.get("next", "FINISH")
    if isinstance(next_node, str):
        cleaned = next_node.strip().upper()
        if cleaned == "DEVELOPER":
            return "Developer"
        elif cleaned == "EXECUTOR":
            return "Executor"
    return "FINISH"

# Add routing conditional edges from Supervisor
workflow.add_conditional_edges(
    "Supervisor",
    route_supervisor,
    {
        "Developer": "Developer",
        "Executor": "Executor",
        "FINISH": END
    }
)

# Workers always report back to Supervisor to check off tasks
workflow.add_edge("Developer", "Supervisor")
workflow.add_edge("Executor", "Supervisor")

# Set entry point
workflow.set_entry_point("Supervisor")



# Compile graph with memory components
app = workflow.compile(
    checkpointer=get_checkpointer(),
    store=get_store()
)
