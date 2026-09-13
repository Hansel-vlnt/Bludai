import json
import re
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from langchain_core.messages import SystemMessage, AIMessage
from bludai.core.llm_client import get_llm_client
from bludai.core.skills_manager import skills_manager
from bludai.core.settings_manager import settings_manager
from bludai.core.state import AgentState
from bludai.core.memory import get_store

class SupervisorResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    next_node: str = Field(
        default="FINISH",
        description="The next worker to execute. Must be 'Developer', 'Executor', or 'FINISH'."
    )
    updated_checklist: str = Field(
        default="",
        description="The current checklist of tasks, updating completions (e.g. [x] Task 1, [ ] Task 2)."
    )
    instruction: str = Field(
        default="",
        description="Detailed instruction for the selected worker node. If next_node is 'FINISH', write the final output response for the user here."
    )
    thought: Optional[str] = Field(
        default=None,
        description="Internal reasoning or thought process before delegating or answering."
    )

def parse_supervisor_response(raw_text: str) -> SupervisorResponse:
    """
    Robustly parses model output into a valid SupervisorResponse.
    Gracefully handles:
    - Markdown code fences (```json ... ``` or ``` ... ```)
    - Preamble/postamble commentary
    - Field name variations (checklist vs updated_checklist, message/reply vs instruction)
    - Thought/reasoning fields
    - Conversational plain text (auto-routes to FINISH without crashing)
    """
    cleaned = raw_text.strip()
    
    # Extract any <think>...</think> reasoning tags
    thought_match = re.search(r"<think>([\s\S]*?)</think>", cleaned)
    extracted_thought = thought_match.group(1).strip() if thought_match else None
    cleaned_no_think = re.sub(r"<think>[\s\S]*?</think>", "", cleaned).strip()
    
    # 1. Search for markdown code fence
    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned_no_think, re.IGNORECASE)
    if json_match:
        candidate = json_match.group(1).strip()
    else:
        # 2. Search for outermost curly braces
        brace_match = re.search(r"(\{[\s\S]*\})", cleaned_no_think)
        if brace_match:
            candidate = brace_match.group(1).strip()
        else:
            candidate = cleaned_no_think

    try:
        data = json.loads(candidate)
        if isinstance(data, dict):
            # Normalize next_node
            raw_node = str(data.get("next_node") or data.get("next") or data.get("node") or data.get("action") or "FINISH").strip()
            low_node = raw_node.lower()
            if "dev" in low_node:
                next_node = "Developer"
            elif "exec" in low_node:
                next_node = "Executor"
            else:
                next_node = "FINISH"
                
            # Normalize checklist
            raw_checklist = data.get("updated_checklist") or data.get("checklist") or data.get("tasks") or ""
            if isinstance(raw_checklist, list):
                raw_checklist = "\n".join(str(x) for x in raw_checklist)
            updated_checklist = str(raw_checklist)
            
            # Normalize instruction
            raw_instruction = (
                data.get("instruction") or 
                data.get("message") or 
                data.get("response") or 
                data.get("reply") or 
                data.get("answer") or 
                data.get("content") or 
                ""
            )
            thought = data.get("thought") or extracted_thought
            if not raw_instruction and next_node == "FINISH":
                raw_instruction = thought or cleaned_no_think
                
            return SupervisorResponse(
                next_node=next_node,
                updated_checklist=updated_checklist,
                instruction=str(raw_instruction),
                thought=thought
            )
    except Exception:
        pass
        
    # Safe fallback: plain text answer treated as direct response to user
    return SupervisorResponse(
        next_node="FINISH",
        updated_checklist="",
        instruction=cleaned_no_think or cleaned,
        thought=extracted_thought
    )

def supervisor_node(state: AgentState) -> dict:
    """Orchestrator node that checks progress against the checklist and routes to workers."""
    # Get 9Router client for this specific role
    llm = get_llm_client(role="Supervisor", temperature=state.get("temperature", 0.0))
    
    # Inject loaded skills playbooks if any
    skills_prompt = skills_manager.get_skill_system_prompt_addition()
    
    # Query Long-Term Memory (BaseStore)
    store = get_store()
    facts = "None"
    if store:
        results = store.search(("facts", "user"))
        if results:
            facts = "\n- ".join([item.value.get("fact", str(item.value)) for item in results])
    from bludai.core.vector_store import vector_store

    # Query Semantic Long-Term Memory (ChromaDB Vector Database)
    semantic_memories = "None"
    last_user_text = ""
    for msg in reversed(state.get("messages", [])):
        if getattr(msg, "type", "") == "human" or getattr(msg, "role", "") == "user":
            last_user_text = str(msg.content)
            break
            
    if last_user_text:
        vector_hits = vector_store.search_memory(last_user_text, n_results=3)
        if vector_hits:
            semantic_memories = "\n- ".join(vector_hits)

    # Query custom instructions/rules from settings
    custom_rules = settings_manager.get_system_instructions()
    rules_section = f"\n[USER CUSTOM INSTRUCTIONS / PLATFORM RULES]:\n{custom_rules}\n" if custom_rules else ""

    system_prompt = f"""You are the Supervisor (Orchestrator) for the BLUDAI Multi-Agent System.
Your job is to coordinate a Developer node (creates/modifies/searches files) and an Executor node (runs terminal commands) to solve the user's request.

Operational Guidelines:
1. Break down the user's request into a checklist of subtasks and track them in `checklist`.
2. Inspect the current message history and tools output. Mark tasks as completed [x] or pending [ ].
3. Decide the next worker node to call:
   - 'Developer': for file operations and code research (searching, creating, modifying, reading files). Instruct Developer to use `semantic_code_search` when you need to locate existing components or logic.
   - 'Executor': for terminal command executions (compiling, testing, git commands, installing dependencies).
   - 'FINISH': when all tasks on the checklist are complete or when you can answer the user directly.
4. Delegate instructions clearly to the worker. Do not try to write code yourself—instruct Developer to do it. Do not execute command strings yourself—instruct Executor to do it.

RESPONSE FORMAT:
You MUST respond with a JSON object conforming to this schema:
{{
  "thought": "Your internal analysis and reasoning on current state and next step",
  "updated_checklist": "The updated checklist string (e.g. [x] Step 1\\n[ ] Step 2)",
  "next_node": "Developer" | "Executor" | "FINISH",
  "instruction": "Detailed instruction for worker, OR final user response if next_node is FINISH"
}}

[SEMANTIC LONG-TERM MEMORY (ChromaDB)]:
- {semantic_memories}

[LONG-TERM FACTS (BaseStore)]:
- {facts}

{skills_prompt}
{rules_section}
"""
    
    # Assemble messages
    messages = [SystemMessage(content=system_prompt)]
    
    checklist_status = state.get("checklist", "")
    if checklist_status:
        messages.append(SystemMessage(content=f"Current Checklist:\n{checklist_status}"))
        
    messages.extend(state["messages"])
    
    # Invoke model and parse robustly
    try:
        raw_res = llm.invoke(messages)
        if hasattr(raw_res, "content"):
            if isinstance(raw_res.content, list):
                text_parts = []
                for part in raw_res.content:
                    if isinstance(part, dict) and "text" in part:
                        text_parts.append(part["text"])
                    elif isinstance(part, str):
                        text_parts.append(part)
                raw_content = "\n".join(text_parts)
            else:
                raw_content = str(raw_res.content)
        else:
            raw_content = str(raw_res)
            
        response = parse_supervisor_response(raw_content)
    except Exception as e:
        response = SupervisorResponse(
            next_node="FINISH",
            updated_checklist="",
            instruction=f"I encountered a temporary processing issue: {e}. Please try again."
        )
    
    # Update next
    next_node = response.next_node
    updated_checklist = response.updated_checklist
    instruction = response.instruction
    
    # If next node is FINISH, add the final answer to the conversation state as an AIMessage
    new_messages = []
    if next_node == "FINISH":
        kwargs = {}
        if response.thought:
            kwargs["reasoning_content"] = response.thought
        new_messages.append(AIMessage(content=instruction, additional_kwargs=kwargs))
    else:
        # Append Supervisor's delegation instruction to direct the worker
        new_messages.append(SystemMessage(content=f"[Supervisor Instruction for {next_node}]: {instruction}"))
        
    return {
        "messages": new_messages,
        "checklist": updated_checklist,
        "next": next_node
    }
