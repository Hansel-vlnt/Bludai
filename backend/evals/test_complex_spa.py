import os
import sys
import threading
import http.server
import socketserver
import time
import requests

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

def start_server(directory, port):
    os.chdir(directory)
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", port), Handler) as httpd:
        print(f"\n[Localhost Server] Serving at http://localhost:{port}")
        httpd.serve_forever()

def main():
    print("Starting Headless Complex SPA Simulation...")
    
    # Create the public directory for the server
    public_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "public"))
    os.makedirs(public_dir, exist_ok=True)
    
    # Start the local server in a background thread
    port = 8080
    server_thread = threading.Thread(target=start_server, args=(public_dir, port), daemon=True)
    server_thread.start()
    
    # Wait for server to boot
    time.sleep(2)
    
    prompt = (
        "[CRITICAL INSTRUCTION FOR SUPERVISOR: You MUST NOT write the code yourself. "
        "You MUST orchestrate the following workflow step-by-step:\n"
        "1. Route to 'Developer' to write the code. Developer MUST use the `create_file` tool to save the code to 'backend/evals/public/index.html'.\n"
        "2. Route to 'CodeReviewer' to review the code in 'backend/evals/public/index.html'. The CodeReviewer MUST suggest adding a dark mode toggle.\n"
        "3. Route to 'Developer' again to implement the dark mode toggle using file tools.\n"
        "4. Conclude the task.\n"
        "Do NOT do the work yourself. Output JSON to delegate.]\n\n"
        "Please build a promotional Single Page Application (SPA) for a new AI product. The page should have a hero section and features. Save it to backend/evals/public/index.html so I can view it on localhost."
    )
    
    inputs = {"messages": [HumanMessage(content=prompt)]}
    config = {"configurable": {"thread_id": "sim_complex_spa_01"}}
    
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
                    print(f"    [Supervisor Routing]: Next -> {next_node}")
                    if raw_content:
                        print(f"    [Supervisor Instruction]: {raw_content[:200].strip()}...")
                
                elif node_name == "tools":
                    msgs = state_update.get("messages", [])
                    if msgs:
                        last_msg = msgs[-1]
                        print(f"    [Tool Executed]: {last_msg.name}")
                        print(f"    [Tool Result]: {last_msg.content[:200]}...")
                
                else:
                    messages = state_update.get("messages", [])
                    if messages:
                        last_msg = messages[-1]
                        if isinstance(last_msg, AIMessage):
                            tool_calls = getattr(last_msg, "tool_calls", [])
                            if tool_calls:
                                for tc in tool_calls:
                                    print(f"    [{node_name} CALLING TOOL]: {tc['name']} with args {str(tc['args'])[:200]}")
                            else:
                                content_preview = last_msg.content[:400] + "..." if len(last_msg.content) > 400 else last_msg.content
                                print(f"    [{node_name} Output]: {content_preview.strip()}")
                
                print("-" * 50)
    except Exception as e:
        print(f"\n[ERROR] Simulation failed: {e}")

    print("\n" + "="*50)
    print("SIMULATION SUMMARY")
    print("="*50)
    print(f"Node Execution Trace: {' -> '.join(node_trace)}")
    print("\nSimulation Complete.")
    
    # Verification
    try:
        res = requests.get(f"http://localhost:{port}/index.html")
        if res.status_code == 200:
            print("\n[Verification] Successfully accessed http://localhost:8080/index.html")
            print(f"HTML Preview:\n{res.text[:300]}...")
        else:
            print(f"\n[Verification] Failed to access index.html (HTTP {res.status_code})")
    except Exception as e:
        print(f"\n[Verification] Could not reach localhost server: {e}")

if __name__ == "__main__":
    main()
