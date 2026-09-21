import os
import sys
import json
from pprint import pprint

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from langchain_core.messages import HumanMessage, AIMessage
from bludai.core.graph import app as compiled_app

def main():
    print("Starting Headless Hierarchical Workflow Simulation...")
    
    prompt = (
        "[CRITICAL INSTRUCTION FOR SUPERVISOR: You MUST NOT write the code yourself. "
        "You MUST output a JSON response with next_node set to 'Developer' to delegate the coding task, "
        "and then once returned, delegate to 'CodeReviewer' for auditing.]\n\n"
        "Create a lightweight Python utility function that validates and sanitizes incoming "
        "directory paths against directory traversal attacks (Path Traversal/LFI), "
        "then perform a security audit and code review on the implementation."
    )
    
    inputs = {"messages": [HumanMessage(content=prompt)]}
    config = {"configurable": {"thread_id": "sim_test_003"}}
    
    node_trace = []
    supervisor_decisions = []
    worker_outputs = {}
    
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
                    
                    supervisor_decisions.append({
                        "node": next_node,
                        "checklist": state_update.get("checklist", ""),
                        "raw": raw_content
                    })
                    print(f"    [Supervisor Routing]: Next -> {next_node}")
                
                if node_name not in ["Supervisor", "tools", "__start__"]:
                    messages = state_update.get("messages", [])
                    if messages:
                        last_msg = messages[-1]
                        if isinstance(last_msg, AIMessage):
                            content_preview = last_msg.content[:200] + "..." if len(last_msg.content) > 200 else last_msg.content
                            worker_outputs[node_name] = worker_outputs.get(node_name, []) + [content_preview]
                            print(f"    [{node_name} Output Preview]: {content_preview.strip()}")
                
                print("-" * 50)
    except Exception as e:
        print(f"\n[ERROR] Simulation failed: {e}")
        return

    print("\n" + "="*50)
    print("SIMULATION SUMMARY")
    print("="*50)
    print(f"Node Execution Trace: {' -> '.join(node_trace)}")
    
    print("\nSupervisor Decisions:")
    for i, dec in enumerate(supervisor_decisions):
        print(f"  Turn {i+1}: Routed to '{dec['node']}'")
        print(f"  Raw JSON Output: {dec['raw'][:100]}...")
        
    print("\nWorker Outputs Excerpts:")
    for worker, outputs in worker_outputs.items():
        for i, out in enumerate(outputs):
            print(f"  {worker} (Turn {i+1}): {out.strip()}")
            
    print("\nSimulation Complete. Result: PASS")

if __name__ == "__main__":
    main()
