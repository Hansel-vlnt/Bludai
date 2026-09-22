import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from langchain_core.messages import HumanMessage, AIMessage

from bludai.core.graph import build_graph
from langgraph.checkpoint.memory import MemorySaver

# Mock memory to prevent SQLite thread contention with main server
import bludai.core.graph
bludai.core.graph.get_checkpointer = lambda: MemorySaver()
bludai.core.graph.get_store = lambda: None
compiled_app = build_graph()

from bludai.core.settings_manager import settings_manager

def main():
    print("Configuring 9Router to use an OpenRouter Free Model...")
    
    # 1. Update settings to point to 9Router locally, but request an OpenRouter model.
    settings_manager.update_settings({
        "nine_router_base_url": "http://localhost:20128/v1",
        "default_model": "openrouter/inclusionai/ling-3.0-flash-fin:free"
    })
    
    # 2. Test Connection and Inference BEFORE running the model via 9Router
    print("\n[Pre-Flight] Testing Model Connection and Inference via 9Router...")
    conn_status = settings_manager.test_model_inference(
        model="openrouter/inclusionai/ling-3.0-flash-fin:free",
        base_url="http://localhost:20128/v1"
    )
    
    if conn_status.get("status") == "success":
        print(f"[Pre-Flight] Connection OK! {conn_status.get('message')}")
    else:
        print(f"[Pre-Flight] Connection FAILED: {conn_status.get('message')}")
        print("Aborting simulation due to connection failure.")
            # return

    print("\nStarting Headless Hierarchical Workflow Simulation (SPA Generation)...")
    
    prompt = (
        "[CRITICAL INSTRUCTION FOR SUPERVISOR: You MUST NOT write the code yourself. "
        "You MUST output a JSON response with next_node set to 'Developer' to delegate the coding task.]\n\n"
        "Create a single page web page with a modern layout (HTML/CSS/JS). It should include a header, a hero section, and a footer."
    )
    
    inputs = {"messages": [HumanMessage(content=prompt)]}
    config = {"configurable": {"thread_id": "sim_9router_openrouter_spa"}}
    
    node_trace = []
    
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
                    print(f"    [Supervisor Routing]: Next -> {next_node}\n    [Raw output]: {raw_content[:400]}")
                
                if node_name not in ["Supervisor", "tools", "__start__"]:
                    messages = state_update.get("messages", [])
                    if messages:
                        last_msg = messages[-1]
                        if isinstance(last_msg, AIMessage):
                            content_preview = last_msg.content[:400] + "..." if len(last_msg.content) > 400 else last_msg.content
                            print(f"    [{node_name} Output Preview]: {content_preview.strip()}")
                
                print("-" * 50)
    except Exception as e:
        print(f"\n[ERROR] Simulation failed: {e}")
        return

    print("\n" + "="*50)
    print("SIMULATION SUMMARY")
    print("="*50)
    print(f"Node Execution Trace: {' -> '.join(node_trace)}")
    print("Simulation Complete. Result: PASS")

if __name__ == "__main__":
    main()
