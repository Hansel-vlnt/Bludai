from langchain_core.messages import SystemMessage, AIMessage, ToolMessage
from bludai.core.llm_client import get_llm_client
from bludai.tools.file_tools import file_tools
from bludai.tools.vector_tools import vector_tools
from bludai.core.state import AgentState

developer_tools = file_tools + vector_tools

def developer_node(state: AgentState) -> dict:
    """Developer node that manipulates files and returns a text summary of its work."""
    llm = get_llm_client(role="Developer", temperature=state.get("temperature", 0.0))
    
    # Bind file and vector tools
    llm_with_tools = llm.bind_tools(developer_tools)
    
    system_prompt = """You are the Developer node of the BLUDAI Multi-Agent System.
Your job is to search, read, create, and modify codebase files in the local workspace based on the Supervisor's instructions.

Guidelines:
1. Write clean, bug-free, and well-structured code.
2. Use the `semantic_code_search` tool to locate relevant functions, components, or files across the project when you need to understand existing implementations.
3. Use the `create_file` tool to create new files.
4. Use the `read_file` tool to read the contents of existing files.
5. Use the `replace_content` tool to edit existing files. The replacement target must be exact.
6. When you have completed the file operations assigned by the Supervisor, write a clear summary of what you did and return control.
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
            # Find the matching tool
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            tool_id = tool_call["id"]
            
            tool_to_run = next((t for t in developer_tools if t.name == tool_name), None)
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
        
    # Return the new messages to be appended to the shared state
    return {
        "messages": local_new_messages
    }
