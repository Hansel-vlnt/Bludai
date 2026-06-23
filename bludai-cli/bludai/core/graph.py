from langgraph.graph import StateGraph, END
from bludai.core.state import AgentState
from bludai.nodes.supervisor import supervisor_node
from bludai.nodes.developer import developer_node
from bludai.nodes.executor import executor_node

# Initialize graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("Supervisor", supervisor_node)
workflow.add_node("Developer", developer_node)
workflow.add_node("Executor", executor_node)

# Add routing conditional edges from Supervisor
workflow.add_conditional_edges(
    "Supervisor",
    lambda state: state["next"],
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

# Compile graph
app = workflow.compile()
