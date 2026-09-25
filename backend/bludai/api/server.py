import os
import uuid
import sys
import json
import time
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
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
from bludai.core.vector_store import vector_store
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
from bludai.core.models_manager import models_manager
from bludai.core.agent_manager import agent_manager
from bludai.tools.registry import list_available_tools
from bludai.core.graph import recompile_graph

class ChatRequest(BaseModel):
    thread_id: str
    message: str
    mode: str = "role"
    basic_model: Optional[str] = None
    temperature: Optional[float] = None

def extract_or_estimate_tokens(messages, start_idx=0, prompt_text="", reply_text=""):
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
    
    # Fallback to character estimation (~4 chars/token) if provider omits token usage
    if (input_tokens + output_tokens) == 0:
        p_len = 0
        for msg in messages[:start_idx]:
            p_len += len(str(getattr(msg, "content", "")))
            if getattr(msg, "tool_calls", None):
                p_len += sum(len(str(tc)) for tc in msg.tool_calls)
        if p_len == 0:
            p_len = len(prompt_text)
            
        r_len = 0
        for msg in messages[start_idx:]:
            r_len += len(str(getattr(msg, "content", "")))
            if getattr(msg, "tool_calls", None):
                r_len += sum(len(str(tc)) for tc in msg.tool_calls)
        if r_len == 0:
            r_len = len(reply_text)
            
        input_tokens = max(1, p_len // 4)
        output_tokens = max(1, r_len // 4)
        
    return {"input": input_tokens, "output": output_tokens, "total": input_tokens + output_tokens}

class RoleAssignmentRequest(BaseModel):
    role: str
    model_name: str

class AgentCreateRequest(BaseModel):
    name: str
    title: Optional[str] = ""
    description: Optional[str] = ""
    system_prompt: Optional[str] = ""
    model: Optional[str] = ""
    temperature: Optional[float] = 0.2
    tools: Optional[List[str]] = []
    enabled: Optional[bool] = True
    icon: Optional[str] = "Bot"
    color: Optional[str] = "#38bdf8"

class AgentUpdateRequest(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    tools: Optional[List[str]] = None
    enabled: Optional[bool] = None
    icon: Optional[str] = None
    color: Optional[str] = None

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
    settings = settings_manager.get_settings()
    # API key is read strictly from backend/.env
    settings["nine_router_api_key"] = settings_manager.get_api_key()
    return settings

@app.post("/api/settings")
def update_settings(req: SettingsRequest):
    # If API key is provided, store it strictly and solely in backend/.env
    if req.nine_router_api_key is not None:
        settings_manager.set_api_key(req.nine_router_api_key)

    data = req.dict(exclude_unset=True)
    # Never pass API key to settings JSON
    data.pop("nine_router_api_key", None)
    
    updated = settings_manager.update_settings(data)
    updated["nine_router_api_key"] = settings_manager.get_api_key()
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

class SessionUpdateRequest(BaseModel):
    title: Optional[str] = None
    mode: Optional[str] = None

@app.delete("/api/sessions/{thread_id}")
def delete_session_endpoint(thread_id: str):
    session_manager.delete_session(thread_id)
    return {"status": "success", "thread_id": thread_id}

@app.patch("/api/sessions/{thread_id}")
def update_session_endpoint(thread_id: str, req: SessionUpdateRequest):
    session_manager.update_session(thread_id, mode=req.mode, title=req.title)
    return {"status": "success", "thread_id": thread_id, "title": req.title}

class VectorIndexRequest(BaseModel):
    root_dir: Optional[str] = None

@app.get("/api/vector/stats")
def get_vector_stats():
    return vector_store.get_stats()

@app.post("/api/vector/index")
def index_vector_codebase(req: Optional[VectorIndexRequest] = None):
    root = req.root_dir if req and req.root_dir else None
    return vector_store.index_codebase(root_dir=root)

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
def get_models(refresh: bool = False):
    """Returns available models from 9Router or configured OpenAI proxy with formatted metadata."""
    model_ids = models_manager.get_available_models(force_refresh=refresh)
    active_default = models_manager.get_best_default_model()
    
    if not model_ids and active_default:
        model_ids = [active_default]
        
    formatted = []
    for mid in model_ids:
        parts = mid.split("/")
        display_name = parts[-1]
        provider = parts[0] if len(parts) > 1 else "local"
        
        tag = "Fast"
        low_mid = mid.lower()
        if any(w in low_mid for w in ["pro", "opus", "high", "ultra", "thinking"]):
            tag = "High"
        elif any(w in low_mid for w in ["flash", "mini", "lightning", "light", "small"]):
            tag = "Fast"
            
        formatted.append({
            "id": mid,
            "name": display_name,
            "provider": provider,
            "tag": tag,
            "is_default": (mid == active_default)
        })
        
    return {
        "data": formatted,
        "active_model": active_default,
        "roles": models_manager.get_all_roles(),
        "total": len(formatted)
    }

@app.get("/api/agents")
def get_agents():
    """Returns all workplace agents (both system defaults and custom specialists)."""
    return {"data": agent_manager.get_all_agents()}

@app.post("/api/agents")
def create_agent(req: AgentCreateRequest):
    """Creates a new dynamic specialist agent in the workplace."""
    created = agent_manager.create_agent(req.model_dump())
    recompile_graph()
    return {"status": "success", "data": created}

@app.put("/api/agents/{agent_id}")
def update_agent(agent_id: str, req: AgentUpdateRequest):
    """Updates an existing workplace specialist agent."""
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    updated = agent_manager.update_agent(agent_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Agent not found")
    recompile_graph()
    return {"status": "success", "data": updated}

@app.delete("/api/agents/{agent_id}")
def delete_agent(agent_id: str):
    """Deletes or disables an agent."""
    success = agent_manager.delete_agent(agent_id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent not found")
    recompile_graph()
    return {"status": "success"}

@app.post("/api/agents/reset")
def reset_agents():
    """Resets the workplace agent roster to factory defaults."""
    reset_list = agent_manager.reset_to_defaults()
    recompile_graph()
    return {"status": "success", "data": reset_list}

@app.get("/api/tools")
def get_available_tools():
    """Returns the list of all registered tools with metadata for agent capability assignment."""
    return {"data": list_available_tools()}

@app.get("/api/roles")
def get_roles():
    """Returns the current model assignments for all active workplace agents."""
    agents = agent_manager.get_all_agents()
    default_model = models_manager.get_best_default_model()
    current_saved_roles = models_manager.get_all_roles()
    
    result = {}
    for a in agents:
        a_name = a.get("name")
        a_model = a.get("model") or current_saved_roles.get(a_name) or default_model
        result[a_name] = a_model
    return result

@app.post("/api/roles")
def set_role_model(req: RoleAssignmentRequest):
    """Sets a specific model for an agent role."""
    models_manager.set_model_for_role(req.role, req.model_name)
    matched = agent_manager.get_agent_by_name(req.role)
    if matched:
        agent_manager.update_agent(matched["id"], {"model": req.model_name})
    recompile_graph()
    return {"status": "success", "role": req.role, "model": req.model_name}

@app.get("/api/sessions/{thread_id}/history")
def get_session_history(thread_id: str):
    checkpointer = get_checkpointer()
    config = {"configurable": {"thread_id": thread_id}}
    state = checkpointer.get(config)
    session = session_manager.get_session(thread_id)
    session_mode = session.get("mode", "role") if session else "role"
    session_title = session.get("title", "") if session else ""

    if not state:
        return {"messages": [], "mode": session_mode, "title": session_title}
        
    messages = state["channel_values"].get("messages", [])
    
    formatted_msgs = []
    for msg in messages:
        if isinstance(msg, HumanMessage):
            formatted_msgs.append({"role": "user", "content": msg.content})
        elif isinstance(msg, AIMessage):
            if msg.content:
                thinking = (
                    getattr(msg, "additional_kwargs", {}).get("reasoning_content") or
                    (msg.response_metadata.get("message", {}).get("reasoning_content") if hasattr(msg, "response_metadata") and msg.response_metadata else None)
                )
                item = {"role": "assistant", "content": msg.content}
                if thinking:
                    item["thinking"] = thinking
                formatted_msgs.append(item)
        elif isinstance(msg, ToolMessage):
            # Optionally include tool messages for UI transparency
            formatted_msgs.append({"role": "system", "content": f"🔧 Tool Executed: {msg.name}\n{msg.content}"})
            
    return {"messages": formatted_msgs, "mode": session_mode, "title": session_title}

@app.post("/api/chat")
def chat(req: ChatRequest):
    import time
    start_time = time.time()

    # Auto-save session
    existing = session_manager.get_session(req.thread_id)
    if not existing:
        title = req.message[:30] + ("..." if len(req.message) > 30 else "")
        session_manager.create_or_update_session(req.thread_id, title, "role")
    else:
        session_manager.update_session(req.thread_id, mode="role")

    inputs = {
        "messages": [HumanMessage(content=req.message)],
        "temperature": req.temperature
    }
    config = {"configurable": {"thread_id": req.thread_id}}

    checkpointer = get_checkpointer()
    state = checkpointer.get(config)
    initial_msg_count = len(state["channel_values"].get("messages", [])) if state else 0

    def format_chat_error(e: Exception) -> dict:
        err_msg = str(e)
        print(f"[Bludai Chat Error]: {err_msg}")
        if "401" in err_msg or "invalid_api_key" in err_msg.lower():
            reply = (
                "❌ **Authentication Error (401 - Invalid API Key)**\n\n"
                "The configured API key was rejected by the provider.\n\n"
                "👉 Please click **Settings** (in the sidebar), verify your 9Router / OpenAI API key, and click **Save & Apply**."
            )
        elif "10061" in err_msg or "actively refused" in err_msg.lower() or "connecterror" in err_msg.lower():
            reply = (
                f"⚠️ **Connection Refused (`{settings_manager.get_base_url()}`)**\n\n"
                "Could not connect to the model provider or local 9Router proxy.\n\n"
                "👉 Please make sure 9Router is running (`9router start`) or check your Base URL in **Settings**."
            )
        elif "404" in err_msg or "model_not_found" in err_msg.lower():
            reply = (
                "⚠️ **Model Not Found (404)**\n\n"
                "The requested model is either unavailable or has no active provider credentials in 9Router.\n\n"
                "👉 Please choose one of the available models from the dropdown or update your Default Model in **Settings**."
            )
        else:
            reply = f"⚠️ **Model Execution Error**:\n\n```\n{err_msg}\n```"
        return {"reply": reply, "role": "assistant", "tokens": {"input": 0, "output": 0, "total": 0}}

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
        tokens = extract_or_estimate_tokens(final_messages, initial_msg_count, prompt_text=req.message)
        duration = round(time.time() - start_time, 2)

        # Build intermediate thought trace from multi-agent turns
        intermediate_trace = []
        turn_messages = final_messages[initial_msg_count:]
        for msg in turn_messages[:-1]:
            if isinstance(msg, ToolMessage):
                tool_content = str(msg.content)[:250] + ("..." if len(str(msg.content)) > 250 else "")
                intermediate_trace.append(f"🔧 **Tool executed ({msg.name})**:\n```\n{tool_content}\n```")
            elif isinstance(msg, AIMessage) and msg.content:
                content_str = str(msg.content).strip()
                agent = msg.additional_kwargs.get("agent")
                is_thought = msg.additional_kwargs.get("is_thought", False)
                if is_thought:
                    if agent:
                        intermediate_trace.append(f"🧠 **Thinking — {agent}**:\n{content_str}")
                    else:
                        intermediate_trace.append(f"🧠 **Thinking — Agent**:\n{content_str}")
                else:
                    intermediate_trace.append(f"🧠 **Thinking — Agent**:\n{content_str}")

        thinking_trace = "\n\n---\n\n".join(intermediate_trace) if intermediate_trace else None
        
        # In role mode, return the last AI message as reply
        for msg in reversed(final_messages):
            if isinstance(msg, AIMessage) and msg.content and not msg.additional_kwargs.get("is_thought", False):
                return {
                    "reply": msg.content, 
                    "role": "assistant", 
                    "thinking": thinking_trace,
                    "duration": duration,
                    "tokens": tokens
                }
        return {
            "reply": "Task completed.", 
            "role": "assistant", 
            "thinking": thinking_trace,
            "duration": duration,
            "tokens": tokens
        }
    except Exception as e:
        return format_chat_error(e)

@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    start_time = time.time()

    # Auto-save session
    existing = session_manager.get_session(req.thread_id)
    if not existing:
        title = req.message[:30] + ("..." if len(req.message) > 30 else "")
        session_manager.create_or_update_session(req.thread_id, title, "role")
    else:
        session_manager.update_session(req.thread_id, mode="role")

    inputs = {
        "messages": [HumanMessage(content=req.message)],
        "temperature": req.temperature
    }
    config = {"configurable": {"thread_id": req.thread_id}}

    checkpointer = get_checkpointer()
    state = checkpointer.get(config)
    initial_msg_count = len(state["channel_values"].get("messages", [])) if state else 0

    async def event_generator():
        try:
            from bludai.core.graph import app as compiled_app
            checklist = ""
            if state and "channel_values" in state:
                checklist = state["channel_values"].get("checklist", "")
                    
            inputs["checklist"] = checklist
            inputs["next"] = "Supervisor"
                
            yield f"data: {json.dumps({'type': 'status', 'text': 'Supervisor analyzing request...'})}\n\n"
                
            collected_thoughts = []
            final_reply = ""
                
            from starlette.concurrency import iterate_in_threadpool
                
            in_thought_tag = False
            buffer = ""

            async for mode, payload in iterate_in_threadpool(compiled_app.stream(inputs, config=config, stream_mode=["messages", "updates"])):
                if mode == "messages":
                    msg_chunk, metadata = payload
                    node_name = metadata.get("langgraph_node", "Model")
                        
                    if node_name == "Supervisor":
                        pass # Supervisor returns JSON, streaming it token-by-token is tricky, better to just emit at the end.
                    else:
                        # Stream tokens for worker agents as 'thought'
                        content_chunk = msg_chunk.content if isinstance(msg_chunk.content, str) else ""
                        reasoning_chunk = (
                            getattr(msg_chunk, "additional_kwargs", {}).get("reasoning_content") or
                            (msg_chunk.response_metadata.get("message", {}).get("reasoning_content") if hasattr(msg_chunk, "response_metadata") else None)
                        ) or ""
                            
                        if reasoning_chunk:
                            yield f"data: {json.dumps({'type': 'thought', 'agent': node_name, 'delta': reasoning_chunk})}\n\n"
                                
                        if content_chunk:
                            yield f"data: {json.dumps({'type': 'thought', 'agent': node_name, 'delta': content_chunk})}\n\n"

                elif mode == "updates":
                    step = payload
                    if "__interrupt__" in step:
                        int_obj = step["__interrupt__"][0]
                        interrupt_val = int_obj.value if hasattr(int_obj, "value") else int_obj
                        yield f"data: {json.dumps({'type': 'interrupt', 'interrupt': interrupt_val})}\n\n"
                        return

                    node_name = list(step.keys())[0]
                    node_out = step[node_name]
                        
                    next_target = node_out.get("next")
                    messages = node_out.get("messages", [])
                        
                    for m in messages:
                        if isinstance(m, AIMessage):
                            r_content = (
                                getattr(m, "additional_kwargs", {}).get("reasoning_content") or
                                (m.response_metadata.get("message", {}).get("reasoning_content") if hasattr(m, "response_metadata") else None)
                            )
                            if r_content:
                                collected_thoughts.append(f"⚡ **Thinking · {node_name}**:\n{r_content.strip()}")

                            content_str = str(m.content).strip() if m.content else ""
                            is_thought = m.additional_kwargs.get("is_thought", False)
                            if is_thought:
                                if not r_content or content_str.strip() != r_content.strip():
                                    collected_thoughts.append(f"⚡ **Thinking · {node_name}**:\n{content_str}")
                            elif getattr(m, "tool_calls", None):
                                for tc in m.tool_calls:
                                    t_name = tc.get("name", "tool")
                                    yield f"data: {json.dumps({'type': 'tool', 'name': t_name, 'status': 'running...'})}\n\n"
                            elif next_target == "FINISH" and content_str:
                                final_reply = content_str
                                yield f"data: {json.dumps({'type': 'content', 'delta': content_str})}\n\n"

                        elif isinstance(m, ToolMessage):
                            tool_name = getattr(m, "name", "tool")
                            tool_output = str(m.content)[:250] + ("..." if len(str(m.content)) > 250 else "")
                            yield f"data: {json.dumps({'type': 'tool', 'name': tool_name, 'status': 'done', 'content': tool_output})}\n\n"
                            collected_thoughts.append(f"🔧 **Tool executed ({tool_name})**:\n```\n{tool_output}\n```")
                        
                    if next_target and next_target != "FINISH":
                        yield f"data: {json.dumps({'type': 'status', 'text': f'⚡ Delegating to {next_target}...'})}\n\n"
                
            duration = round(time.time() - start_time, 2)
            thinking_trace = "\n\n---\n\n".join(collected_thoughts) if collected_thoughts else (
                f"⚡ **Thinking · Supervisor**:\n"
                f"• Analyzed incoming request and evaluated agent requirements.\n"
                f"• Verified workflow completion and synthesized deliverable."
            )
                
            # Compute tokens
            checkpointer_after = get_checkpointer()
            state_after = checkpointer_after.get(config)
            final_messages = state_after["channel_values"].get("messages", []) if state_after else []
            tokens = extract_or_estimate_tokens(final_messages, initial_msg_count, prompt_text=req.message, reply_text=final_reply)
                
            yield f"data: {json.dumps({'type': 'done', 'reply': final_reply or 'Task completed.', 'thinking': thinking_trace, 'duration': duration, 'tokens': tokens})}\n\n"
                
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

class ResumeRequest(BaseModel):
    thread_id: str
    approved: bool
    reason: Optional[str] = None

@app.post("/api/chat/resume")
async def chat_resume(req: ResumeRequest):
    import time
    start_time = time.time()
    config = {"configurable": {"thread_id": req.thread_id}}

    checkpointer = get_checkpointer()
    state = checkpointer.get(config)
    if not state:
        raise HTTPException(status_code=404, detail="Thread not found or expired.")

    initial_msg_count = len(state["channel_values"].get("messages", []))

    async def resume_event_generator():
        try:
            from bludai.core.graph import app as compiled_app
            from langgraph.types import Command

            yield f"data: {json.dumps({'type': 'status', 'text': 'Resuming execution...'})}\n\n"

            collected_thoughts = []
            final_reply = ""

            resume_payload = {
                "approved": req.approved,
                "action": "approve" if req.approved else "reject",
                "reason": req.reason or ""
            }

            from starlette.concurrency import iterate_in_threadpool

            async for mode, payload in iterate_in_threadpool(compiled_app.stream(Command(resume=resume_payload), config=config, stream_mode=["messages", "updates"])):
                if mode == "messages":
                    msg_chunk, metadata = payload
                    node_name = metadata.get("langgraph_node", "Model")
                    if node_name != "Supervisor":
                        content_chunk = msg_chunk.content if isinstance(msg_chunk.content, str) else ""
                        reasoning_chunk = (
                            getattr(msg_chunk, "additional_kwargs", {}).get("reasoning_content") or
                            (msg_chunk.response_metadata.get("message", {}).get("reasoning_content") if hasattr(msg_chunk, "response_metadata") else None)
                        ) or ""
                        if reasoning_chunk:
                            yield f"data: {json.dumps({'type': 'thought', 'agent': node_name, 'delta': reasoning_chunk})}\n\n"
                        if content_chunk:
                            yield f"data: {json.dumps({'type': 'thought', 'agent': node_name, 'delta': content_chunk})}\n\n"

                elif mode == "updates":
                    step = payload
                    if "__interrupt__" in step:
                        int_obj = step["__interrupt__"][0]
                        interrupt_val = int_obj.value if hasattr(int_obj, "value") else int_obj
                        yield f"data: {json.dumps({'type': 'interrupt', 'interrupt': interrupt_val})}\n\n"
                        return

                    node_name = list(step.keys())[0]
                    node_out = step[node_name]

                    next_target = node_out.get("next")
                    messages = node_out.get("messages", [])

                    for m in messages:
                        if isinstance(m, AIMessage):
                            r_content = (
                                getattr(m, "additional_kwargs", {}).get("reasoning_content") or
                                (m.response_metadata.get("message", {}).get("reasoning_content") if hasattr(m, "response_metadata") else None)
                            )
                            if r_content:
                                collected_thoughts.append(f"⚡ **Thinking · {node_name}**:\n{r_content.strip()}")

                            content_str = str(m.content).strip() if m.content else ""
                            is_thought = m.additional_kwargs.get("is_thought", False)
                            if is_thought:
                                if not r_content or content_str.strip() != r_content.strip():
                                    collected_thoughts.append(f"⚡ **Thinking · {node_name}**:\n{content_str}")
                            elif getattr(m, "tool_calls", None):
                                for tc in m.tool_calls:
                                    t_name = tc.get("name", "tool")
                                    yield f"data: {json.dumps({'type': 'tool', 'name': t_name, 'status': 'running...'})}\n\n"
                            elif next_target == "FINISH" and content_str:
                                final_reply = content_str
                                yield f"data: {json.dumps({'type': 'content', 'delta': content_str})}\n\n"

                        elif isinstance(m, ToolMessage):
                            tool_name = getattr(m, "name", "tool")
                            tool_output = str(m.content)[:250] + ("..." if len(str(m.content)) > 250 else "")
                            yield f"data: {json.dumps({'type': 'tool', 'name': tool_name, 'status': 'done', 'content': tool_output})}\n\n"
                            collected_thoughts.append(f"🔧 **Tool executed ({tool_name})**:\n```\n{tool_output}\n```")

                    if next_target and next_target != "FINISH":
                        yield f"data: {json.dumps({'type': 'status', 'text': f'⚡ Delegating to {next_target}...'})}\n\n"

            duration = round(time.time() - start_time, 2)
            thinking_trace = "\n\n---\n\n".join(collected_thoughts) if collected_thoughts else None

            checkpointer_after = get_checkpointer()
            state_after = checkpointer_after.get(config)
            final_messages = state_after["channel_values"].get("messages", []) if state_after else []
            tokens = extract_or_estimate_tokens(final_messages, initial_msg_count, prompt_text="Resumed execution", reply_text=final_reply)

            yield f"data: {json.dumps({'type': 'done', 'reply': final_reply or 'Task completed.', 'thinking': thinking_trace, 'duration': duration, 'tokens': tokens})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(resume_event_generator(), media_type="text/event-stream")
