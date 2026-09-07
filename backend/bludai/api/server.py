import os
import uuid
import sys
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

# Ensure workspace is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Load .env variables
load_dotenv(os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")), ".env"))

from bludai.core.session_manager import session_manager
from bludai.core.memory import get_checkpointer
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage

app = FastAPI(title="Bludai API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from bludai.core.settings_manager import settings_manager

class ChatRequest(BaseModel):
    thread_id: str
    message: str
    mode: str = "role"
    basic_model: str = "meta-llama/llama-3-8b-instruct:free"
    temperature: float = 0.5

class SettingsRequest(BaseModel):
    nine_router_api_key: Optional[str] = None
    nine_router_base_url: Optional[str] = None
    default_model: Optional[str] = None
    default_temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    system_instructions: Optional[str] = None
    execution_mode: Optional[str] = None
    max_steps: Optional[int] = None
    show_thinking: Optional[bool] = None
    theme_accent: Optional[str] = None

class TestConnectionRequest(BaseModel):
    base_url: Optional[str] = None
    api_key: Optional[str] = None

@app.get("/api/settings")
def get_settings():
    return settings_manager.get_settings()

@app.post("/api/settings")
def update_settings(req: SettingsRequest):
    data = req.dict(exclude_unset=True)
    updated = settings_manager.update_settings(data)
    return {"status": "success", "settings": updated}

@app.post("/api/settings/test")
def test_connection_endpoint(req: TestConnectionRequest):
    return settings_manager.test_connection(base_url=req.base_url, api_key=req.api_key)

@app.on_event("startup")
def on_startup():
    from bludai.core.skills_manager import skills_manager
    skills_manager.load_all_skills()

@app.get("/api/sessions")
def get_sessions(limit: int = 20):
    return session_manager.get_sessions(limit=limit)

@app.post("/api/sessions/{thread_id}/clear")
def clear_session(thread_id: str):
    # Not fully deleting from sqlite here but a simple wrapper
    return {"status": "ok"}

@app.post("/api/shutdown")
def shutdown():
    import os
    import threading
    import subprocess
    
    def kill_server():
        # Kill the hidden frontend (Vite/Node) processes safely without killing other unrelated Node apps
        if os.name == 'nt':
            kill_cmd = 'powershell -Command "Get-CimInstance Win32_Process -Filter \\"CommandLine LIKE \'%vite%\'\\" | Invoke-CimMethod -MethodName Terminate"'
            subprocess.run(kill_cmd, shell=True, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
            
        # Hard exit the backend to prevent ghost processes on port 8000
        os._exit(0)
        
    # Run in a separate thread so we can return the response before dying
    threading.Timer(1.0, kill_server).start()
    return {"status": "shutting down"}

@app.get("/api/models")
def get_models():
    import urllib.request
    import json
    try:
        base_url = settings_manager.get_base_url().rstrip("/")
        api_key = settings_manager.get_api_key()
        req = urllib.request.Request(f"{base_url}/models")
        if api_key:
            req.add_header("Authorization", f"Bearer {api_key}")
            
        with urllib.request.urlopen(req, timeout=3) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching models: {e}")
        default_m = settings_manager.get_settings().get("default_model", "meta-llama/llama-3-8b-instruct:free")
        return {"data": [{"id": default_m}]}

@app.get("/api/sessions/{thread_id}/history")
def get_session_history(thread_id: str):
    checkpointer = get_checkpointer()
    config = {"configurable": {"thread_id": thread_id}}
    state = checkpointer.get(config)
    if not state:
        return {"messages": []}
        
    messages = state["channel_values"].get("messages", [])
    
    formatted_msgs = []
    for msg in messages:
        if isinstance(msg, HumanMessage):
            formatted_msgs.append({"role": "user", "content": msg.content})
        elif isinstance(msg, AIMessage):
            if msg.content:
                formatted_msgs.append({"role": "assistant", "content": msg.content})
        elif isinstance(msg, ToolMessage):
            # Optionally include tool messages for UI transparency
            formatted_msgs.append({"role": "system", "content": f"🔧 Tool Executed: {msg.name}\n{msg.content}"})
            
    return {"messages": formatted_msgs}

@app.post("/api/chat")
def chat(req: ChatRequest):
    # Auto-save session
    existing = session_manager.get_session(req.thread_id)
    if not existing:
        title = req.message[:30] + ("..." if len(req.message) > 30 else "")
        session_manager.create_or_update_session(req.thread_id, title, req.mode)
    else:
        session_manager.update_timestamp(req.thread_id)

    inputs = {
        "messages": [HumanMessage(content=req.message)],
        "temperature": req.temperature
    }
    config = {"configurable": {"thread_id": req.thread_id}}

    checkpointer = get_checkpointer()
    state = checkpointer.get(config)
    initial_msg_count = len(state["channel_values"].get("messages", [])) if state else 0

    def calculate_tokens(messages, start_idx):
        input_tokens = 0
        output_tokens = 0
        for msg in messages[start_idx:]:
            if isinstance(msg, AIMessage):
                usage = getattr(msg, "usage_metadata", None)
                if usage:
                    input_tokens += usage.get("input_tokens", 0)
                    output_tokens += usage.get("output_tokens", 0)
                elif hasattr(msg, "response_metadata") and "token_usage" in msg.response_metadata:
                    tokens = msg.response_metadata["token_usage"]
                    input_tokens += tokens.get("prompt_tokens", 0)
                    output_tokens += tokens.get("completion_tokens", 0)
        return {"input": input_tokens, "output": output_tokens, "total": input_tokens + output_tokens}

    if req.mode == "basic":
        from bludai.core.graph_basic import basic_app
        inputs["basic_model"] = req.basic_model
        
        try:
            result = basic_app.invoke(inputs, config=config)
            final_messages = result.get("messages", [])
            tokens = calculate_tokens(final_messages, initial_msg_count)
            
            if final_messages:
                last_msg = final_messages[-1]
                return {"reply": last_msg.content, "role": "assistant", "tokens": tokens}
            return {"reply": "", "role": "assistant", "tokens": tokens}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Role mode
        from bludai.core.graph import app as compiled_app
        
        checklist = ""
        if state and "channel_values" in state:
            checklist = state["channel_values"].get("checklist", "")
            
        inputs["checklist"] = checklist
        inputs["next"] = "Supervisor"
        
        try:
            result = compiled_app.invoke(inputs, config=config)
            final_messages = result.get("messages", [])
            tokens = calculate_tokens(final_messages, initial_msg_count)
            
            # In role mode, we return the last AI message
            for msg in reversed(final_messages):
                if isinstance(msg, AIMessage) and msg.content:
                    return {"reply": msg.content, "role": "assistant", "tokens": tokens}
            return {"reply": "Task completed.", "role": "assistant", "tokens": tokens}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
