from typing import TypedDict, Annotated, List, Optional
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class AgentState(TypedDict, total=False):
    # The full conversation and tool execution history
    messages: Annotated[list, add_messages]
    # The active checklist/plan managed by the Supervisor
    checklist: str
    # The next node to execute ("Developer", "Executor", or "FINISH")
    next: str
    # The temperature for model generation (0.0 to 1.0)
    temperature: float
    # Basic mode specific fields
    basic_model: str
