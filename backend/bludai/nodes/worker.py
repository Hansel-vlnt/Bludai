from typing import Callable
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage
from bludai.core.llm_client import get_llm_client
from bludai.core.state import AgentState
from bludai.core.agent_manager import agent_manager
from bludai.tools.registry import resolve_tools

def make_worker_node(agent_id: str) -> Callable[[AgentState], dict]:
    """
    Factory creating an autonomous LangGraph worker node for any dynamic agent.
    Binds the agent's specific tools, custom system prompt, and designated model.
    """
    def worker_node(state: AgentState) -> dict:
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

        # Bind tools to LLM if any are permitted
        llm_with_tools = llm.bind_tools(bound_tools) if bound_tools else llm

        # Build message history for worker turn
        messages = [SystemMessage(content=system_prompt)]
        messages.extend(state.get("messages", [])[-6:])

        local_new_messages = []
        max_steps = 10
        step = 0

        while step < max_steps:
            response = llm_with_tools.invoke(messages)
            if hasattr(response, "additional_kwargs"):
                response.additional_kwargs["agent"] = agent_name
            local_new_messages.append(response)

            tool_calls = getattr(response, "tool_calls", None)
            if not tool_calls:
                # Execution finished
                break

            messages.append(response)

            # Execute tool calls within the agent's whitelisted permissions
            for tc in tool_calls:
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
                messages.append(tool_msg)
                local_new_messages.append(tool_msg)

            step += 1

        return {
            "messages": local_new_messages
        }

    return worker_node
