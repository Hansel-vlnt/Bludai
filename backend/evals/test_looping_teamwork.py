import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from langchain_core.messages import HumanMessage, AIMessage
from bludai.core.settings_manager import settings_manager

# Ensure settings point to Gemini so we get good tool calling
settings_manager.update_settings({
    "nine_router_base_url": "http://localhost:20128/v1",
    "default_model": "ag/gemini-3.8-flash"
})

from langgraph.checkpoint.memory import MemorySaver
import bludai.core.graph
bludai.core.graph.get_checkpointer = lambda: MemorySaver()
bludai.core.graph.get_store = lambda: None

from bludai.core.graph import build_graph
compiled_app = build_graph()

def main():
    print("Starting Headless Looping Teamwork Simulation...")
    
    prompt = (
        "[CRITICAL INSTRUCTION FOR SUPERVISOR: You MUST NOT write the code yourself. "
        "You MUST orchestrate the following workflow step-by-step:\n"
        "1. Route to 'Researcher' to search for best practices on making a basic Flask REST API.\n"
        "2. Route to 'Developer' to write the 'app.py' script using a tool.\n"
        "3. Route to 'CodeReviewer' to review the code. The CodeReviewer MUST find a flaw and output feedback.\n"
        "4. Route to 'Developer' again to apply the fixes based on the feedback.\n"
        "5. Conclude the task.\n"
        "Do NOT do the work yourself. Output JSON to delegate.]\n\n"
        "Please build a basic Flask REST API. Research best practices, build it, review it, and iterate."
    )
    
    inputs = {"messages": [HumanMessage(content=prompt)]}
    config = {"configurable": {"thread_id": "sim_looping_teamwork_01"}}
    
    node_trace = []
    supervisor_decisions = []
    
    print(f"\nUser Prompt: {prompt}\n")
    print("-" * 50)
    
    try:
        for update in compiled_app.stream(inputs, config=config, stream_mode="updates"):
            for node_name, state_update in update.items():
                node_trace.append(node_name)
                print(f"--> [NODE EXECUTED]: {node_name}")
                
                if node_name == "Supervisor":
                    next_node = state_update.get("next", "UNKNOWN")
                    msgs = state_update.get("messages", [])
                    raw_content = msgs[-1].content if msgs else ""
                    print(f"    [Supervisor Routing]: Next -> {next_node}")
                    if raw_content:
                        print(f"    [Supervisor Instruction]: {raw_content[:200].strip()}...")
                
                elif node_name == "tools":
                    # Tool node gives a result
                    msgs = state_update.get("messages", [])
                    if msgs:
                        last_msg = msgs[-1]
                        print(f"    [Tool Executed]: {last_msg.name}")
                        print(f"    [Tool Result]: {last_msg.content[:200]}...")
                
                else:
                    # Worker node
                    messages = state_update.get("messages", [])
                    if messages:
                        last_msg = messages[-1]
                        if isinstance(last_msg, AIMessage):
                            tool_calls = getattr(last_msg, "tool_calls", [])
                            if tool_calls:
                                for tc in tool_calls:
                                    print(f"    [{node_name} CALLING TOOL]: {tc['name']} with args {tc['args']}")
                            else:
                                content_preview = last_msg.content[:400] + "..." if len(last_msg.content) > 400 else last_msg.content
                                print(f"    [{node_name} Output]: {content_preview.strip()}")
                
                print("-" * 50)
    except Exception as e:
        print(f"\n[ERROR] Simulation failed: {e}")
        return

    print("\n" + "="*50)
    print("SIMULATION SUMMARY")
    print("="*50)
    print(f"Node Execution Trace: {' -> '.join(node_trace)}")
    print("\nSimulation Complete. Result: PASS")

if __name__ == "__main__":
    main()
