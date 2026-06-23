from langchain_core.messages import SystemMessage, AIMessage, ToolMessage
from bludai.core.llm_client import get_llm_client
from bludai.tools.shell_tools import shell_tools
from bludai.core.state import AgentState

def executor_node(state: AgentState) -> dict:
    """Executor node that runs shell commands and returns terminal output summaries."""
    llm = get_llm_client()
    
    # Bind shell tools
    llm_with_tools = llm.bind_tools(shell_tools)
    
    system_prompt = """You are the Executor node of the BLUDAI Multi-Agent System.
Your job is to execute terminal commands (such as running tests, installing packages, compiling code, or checking directory listings) on the local host as instructed by the Supervisor.

Guidelines:
1. Only run commands when explicitly requested by the Supervisor.
2. If a command fails, report the error output and exit code clearly so the Supervisor can delegate a fix to the Developer.
3. When you have completed the commands assigned, write a clear summary of the terminal outputs and return control.
"""
    
    # We construct a local history for this worker turn
    messages = [SystemMessage(content=system_prompt)]
    
    # We include conversation history (last few messages to avoid state bloat)
    messages.extend(state["messages"][-6:])
    
    local_new_messages = []
    
    # Run the worker tool execution loop
    max_steps = 10
    step = 0
    while step < max_steps:
        response = llm_with_tools.invoke(messages)
        local_new_messages.append(response)
        
        if not response.tool_calls:
            # Done! No more tool calls.
            break
            
        messages.append(response)
        
        # Execute tool calls
        for tool_call in response.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            tool_id = tool_call["id"]
            
            tool_to_run = next((t for t in shell_tools if t.name == tool_name), None)
            if tool_to_run:
                try:
                    tool_output = tool_to_run.invoke(tool_args)
                except Exception as e:
                    tool_output = f"Error executing tool {tool_name}: {e}"
            else:
                tool_output = f"Error: Tool {tool_name} not found."
                
            tool_msg = ToolMessage(content=str(tool_output), name=tool_name, tool_call_id=tool_id)
            messages.append(tool_msg)
            local_new_messages.append(tool_msg)
            
        step += 1
        
    return {
        "messages": local_new_messages
    }
