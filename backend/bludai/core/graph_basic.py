from langgraph.graph import StateGraph, START, END
from langchain_core.messages import AIMessage, SystemMessage
from bludai.core.llm_client import get_llm_client
from bludai.core.settings_manager import settings_manager
from typing import Annotated, TypedDict
from langgraph.graph.message import add_messages
from bludai.core.memory import get_checkpointer

class BasicState(TypedDict):
    messages: Annotated[list, add_messages]
    basic_model: str
    temperature: float

def basic_node(state: BasicState):
    temp = state.get("temperature", 0.5)
    llm = get_llm_client(model_id=state.get("basic_model", "meta-llama/llama-3-8b-instruct:free"), temperature=temp)
    
    messages = list(state["messages"])
    custom_rules = settings_manager.get_system_instructions()
    if custom_rules and not any(isinstance(m, SystemMessage) for m in messages):
        messages = [SystemMessage(content=custom_rules)] + messages
        
    response = llm.invoke(messages)
    return {"messages": [response]}

workflow = StateGraph(BasicState)
workflow.add_node("BasicChat", basic_node)
workflow.add_edge(START, "BasicChat")
workflow.add_edge("BasicChat", END)

basic_app = workflow.compile(checkpointer=get_checkpointer())
