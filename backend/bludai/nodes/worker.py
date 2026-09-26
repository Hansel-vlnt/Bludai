from typing import Callable, List
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage
from bludai.core.llm_client import get_llm_client
from bludai.core.state import AgentState
from bludai.core.agent_manager import agent_manager
from bludai.tools.registry import resolve_tools
from bludai.core.telemetry import emit_semantic_event

from langchain_core.runnables.config import RunnableConfig

import re
import json
import time

def extract_fallback_tool_calls(content_str: str) -> list:
    """Extracts tool calls emitted as XML blocks or raw JSON by open-source LLMs."""
    tool_calls = []
    # 1. XML style: <tool_call>name\n<arg_key>k</arg_key>\n<arg_value>v</arg_value>...</tool_call>
    xml_matches = re.finditer(r'<tool_call>\s*([a-zA-Z0-9_]+)\s*([\s\S]*?)</tool_call>', content_str)
    for idx, match in enumerate(xml_matches):
        tool_name = match.group(1).strip()
        body = match.group(2)
        args = {}
        try:
            parsed_json = json.loads(body.strip())
            if isinstance(parsed_json, dict):
                args = parsed_json
        except Exception:
            kv_matches = re.findall(r'<arg_key>\s*(.*?)\s*</arg_key>\s*<arg_value>\s*([\s\S]*?)\s*</arg_value>', body)
            if kv_matches:
                for k, v in kv_matches:
                    args[k.strip()] = v.strip()
        tool_calls.append({
            "name": tool_name,
            "args": args,
            "id": f"call_{idx}_{int(time.time())}",
            "type": "tool_call"
        })

    # 2. JSON style: {"name": "...", "arguments": {...}}
    if not tool_calls:
        json_matches = re.finditer(r'\{\s*"name"\s*:\s*"([a-zA-Z0-9_]+)"\s*,\s*"arguments"\s*:\s*(\{[\s\S]*?\})\s*\}', content_str)
        for idx, match in enumerate(json_matches):
            tool_name = match.group(1).strip()
            try:
                args = json.loads(match.group(2).strip())
                tool_calls.append({
                    "name": tool_name,
                    "args": args,
                    "id": f"call_json_{idx}_{int(time.time())}",
                    "type": "tool_call"
                })
            except Exception:
                pass

    return tool_calls

def make_worker_node(agent_id: str) -> Callable[[AgentState], dict]:
    """
    Factory creating an autonomous LangGraph worker node for any dynamic agent.
    Binds the agent's specific tools, custom system prompt, and designated model.
    """
    def worker_node(state: AgentState, config: RunnableConfig = None) -> dict:
        thread_id = config.get("configurable", {}).get("thread_id", "unknown_thread") if config else "unknown_thread"
        agent = agent_manager.get_agent(agent_id) or agent_manager.get_agent_by_name(agent_id)
        if not agent:
            # Fallback if agent was deleted or missing
            return {
                "messages": [AIMessage(content=f"Agent '{agent_id}' is not configured in this workplace.")]
            }


        agent_name = agent.get("name", agent_id)
        system_prompt = agent.get("system_prompt", "You are a specialized worker agent.")
        agent_model = agent.get("model") or None
        agent_temp = float(agent.get("temperature", state.get("temperature", 0.2)))
        tool_ids = agent.get("tools", [])

        # Resolve whitelisted tools for this agent
        bound_tools = resolve_tools(tool_ids)

        # Initialize LLM for this specific worker
        if agent_model:
            llm = get_llm_client(model_id=agent_model, temperature=agent_temp)
        else:
            llm = get_llm_client(role=agent_name, temperature=agent_temp)

        # Check recent tool executions to prevent runaway loops (safety limit: 6 tool executions per turn)
        recent_tool_count = sum(1 for m in state.get("messages", [])[-12:] if isinstance(m, ToolMessage))
        if recent_tool_count >= 6:
            llm_with_tools = llm
        else:
            # Bind tools to LLM if any are permitted
            llm_with_tools = llm.bind_tools(bound_tools) if bound_tools else llm

        # Build message history for worker turn
        # CRITICAL PROMPT INJECTION FOR FREE MODELS
        system_prompt += "\n\nIMPORTANT: If you use a tool, you MUST use the native JSON function calling format. Do NOT output raw <tool_call> XML blocks."
        messages = [SystemMessage(content=system_prompt)]
        
        # Ensure we don't end with an AIMessage unless it's waiting for tool outputs
        state_msgs = state.get("messages", [])[-8:]
        from langchain_core.messages import HumanMessage
        
        new_state_msgs = []
        for i, m in enumerate(state_msgs):
            # If the supervisor just spoke (AIMessage without tool calls), we treat it as a Human instruction
            if isinstance(m, AIMessage) and not getattr(m, "tool_calls", None) and m.additional_kwargs.get("agent") == "Supervisor":
                new_state_msgs.append(HumanMessage(content=f"[Supervisor]: {m.content}"))
            else:
                new_state_msgs.append(m)
                
        # Fallback: if somehow it still ends with an AIMessage (e.g. from another worker), append a prompt
        if new_state_msgs and isinstance(new_state_msgs[-1], AIMessage) and not getattr(new_state_msgs[-1], "tool_calls", None):
            new_state_msgs.append(HumanMessage(content="Please continue the task based on the above."))

        messages.extend(new_state_msgs)

        response = llm_with_tools.invoke(messages)
        
        # Intelligent fallback tool call extraction for open-source / free models
        if not getattr(response, "tool_calls", None):
            content_str = str(getattr(response, "content", ""))
            if "<tool_call>" in content_str or '"arguments"' in content_str:
                extracted = extract_fallback_tool_calls(content_str)
                if extracted:
                    response.tool_calls = extracted

        if hasattr(response, "additional_kwargs"):
            response.additional_kwargs["agent"] = agent_name
            response.additional_kwargs["is_thought"] = True

        emit_semantic_event(
            thread_id=thread_id,
            event_type="agent_thought",
            node=agent_name,
            content=str(response.content),
            metadata={"tool_calls": getattr(response, "tool_calls", [])}
        )

        return {
            "messages": [response]
        }

    return worker_node

def execute_tools_node(state: AgentState, config: RunnableConfig = None) -> dict:
    """
    Centralized tool execution node for dynamic workplace agents.
    Safely executes tool calls requested by the worker node, supporting
    LangGraph's native interrupt() mechanism for Human-in-the-Loop approvals.
    """
    thread_id = config.get("configurable", {}).get("thread_id", "unknown_thread") if config else "unknown_thread"
    messages = state.get("messages", [])
    if not messages:
        return {"messages": []}

    # Find the most recent AIMessage containing tool calls
    last_ai = None
    for m in reversed(messages):
        if isinstance(m, AIMessage) and getattr(m, "tool_calls", None):
            last_ai = m
            break

    if not last_ai or not getattr(last_ai, "tool_calls", None):
        return {"messages": []}

    agent_name = last_ai.additional_kwargs.get("agent")
    agent = agent_manager.get_agent_by_name(agent_name) if agent_name else None
    tool_ids = agent.get("tools", []) if agent else []
    bound_tools = resolve_tools(tool_ids)

    tool_messages = []
    for tc in last_ai.tool_calls:
        t_name = tc.get("name")
        t_args = tc.get("args", {})
        t_id = tc.get("id")

        tool_to_run = next((t for t in bound_tools if t.name == t_name), None)
        if tool_to_run:
            try:
                t_output = tool_to_run.invoke(t_args)
            except Exception as e:
                t_output = f"Error executing tool {t_name}: {e}"
        else:
            t_output = f"Permission Denied: Tool '{t_name}' is not assigned to agent '{agent_name}'."

        tool_msg = ToolMessage(content=str(t_output), name=t_name, tool_call_id=t_id)
        tool_messages.append(tool_msg)

        emit_semantic_event(
            thread_id=thread_id,
            event_type="tool_execution",
            node="ToolExecutor",
            content=str(t_output),
            metadata={"tool_name": t_name, "args": t_args, "agent": agent_name}
        )

    return {
        "messages": tool_messages
    }

