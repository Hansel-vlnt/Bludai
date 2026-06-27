from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, AIMessage
from bludai.core.llm_client import get_llm_client
from bludai.core.skills_manager import skills_manager
from bludai.core.state import AgentState

class SupervisorResponse(BaseModel):
    next_node: str = Field(
        description="The next worker to execute. Must be 'Developer', 'Executor', or 'FINISH'."
    )
    updated_checklist: str = Field(
        description="The current checklist of tasks, updating completions (e.g. [x] Task 1, [ ] Task 2)."
    )
    instruction: str = Field(
        description="Detailed instruction for the selected worker node. If next_node is 'FINISH', write the final output response for the user here."
    )

def supervisor_node(state: AgentState) -> dict:
    """Orchestrator node that checks progress against the checklist and routes to workers."""
    # Get 9Router client for this specific role
    llm = get_llm_client(role="Supervisor")
    
    # Inject loaded skills playbooks if any
    skills_prompt = skills_manager.get_skill_system_prompt_addition()
    
    system_prompt = f"""You are the Supervisor (Orchestrator) for the BLUDAI Multi-Agent System.
Your job is to coordinate a Developer node (creates/modifies files) and an Executor node (runs terminal commands) to solve the user's request.

Operational Guidelines:
1. Break down the user's request into a checklist of subtasks and track them in `checklist`.
2. Inspect the current message history and tools output. Mark tasks as completed [x] or pending [ ].
3. Decide the next worker node to call:
   - 'Developer': for file operations (creating/modifying/reading files).
   - 'Executor': for terminal command executions (compiling, testing, git commands, installing dependencies).
   - 'FINISH': when all tasks on the checklist are complete or when you can answer the user directly.
4. Delegate instructions clearly to the worker. Do not try to write code yourself—instruct Developer to do it. Do not execute command strings yourself—instruct Executor to do it.

{skills_prompt}
"""
    
    # Bind structured output
    structured_llm = llm.with_structured_output(SupervisorResponse)
    
    # Assemble messages
    messages = [SystemMessage(content=system_prompt)]
    
    # We append a system reminder about the checklist
    checklist_status = state.get("checklist", "")
    if checklist_status:
        messages.append(SystemMessage(content=f"Current Checklist:\n{checklist_status}"))
        
    messages.extend(state["messages"])
    
    # Call the LLM
    response = structured_llm.invoke(messages)
    
    # Update next
    next_node = response.next_node
    updated_checklist = response.updated_checklist
    instruction = response.instruction
    
    # If next node is FINISH, add the final answer to the conversation state as an AIMessage
    new_messages = []
    if next_node == "FINISH":
        new_messages.append(AIMessage(content=instruction))
    else:
        # Append Supervisor's delegation instruction to direct the worker
        new_messages.append(SystemMessage(content=f"[Supervisor Instruction for {next_node}]: {instruction}"))
        
    return {
        "messages": new_messages,
        "checklist": updated_checklist,
        "next": next_node
    }
