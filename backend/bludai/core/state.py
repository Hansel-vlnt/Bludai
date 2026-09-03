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
    # The temperature for model generation (0.0 to 1.0)
    temperature: float
