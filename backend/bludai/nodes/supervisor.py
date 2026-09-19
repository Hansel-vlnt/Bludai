import json
import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from langchain_core.messages import SystemMessage, AIMessage
from bludai.core.llm_client import get_llm_client
from bludai.core.skills_manager import skills_manager
from bludai.core.settings_manager import settings_manager
from bludai.core.state import AgentState
from bludai.core.memory import get_store
from bludai.core.telemetry import emit_semantic_event
from langchain_core.runnables.config import RunnableConfig

from bludai.core.agent_manager import agent_manager

class SupervisorResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    next_node: str = Field(
        default="FINISH",
        description="The next worker to execute. Must be one of the available specialist names, or 'FINISH'."
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

def parse_supervisor_response(
    raw_text: str, 
    enabled_agents: Optional[list] = None, 
    default_thought: Optional[str] = None
) -> SupervisorResponse:
    """
    Robustly parses model output into a valid SupervisorResponse.
    Dynamically validates next_node against the active workplace agent roster.
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
            # Normalize next_node dynamically
            raw_node = str(data.get("next_node") or data.get("next") or data.get("node") or data.get("action") or "FINISH").strip()
            low_node = raw_node.lower()
            
            next_node = "FINISH"
            if "finish" in low_node or "done" in low_node or not raw_node:
                next_node = "FINISH"
            elif enabled_agents:
                # 1. Exact or case-insensitive match on name or ID
                for a in enabled_agents:
                    if a.get("name", "").lower() == low_node or a.get("id", "").lower() == low_node:
                        next_node = a.get("name")
                        break
                # 2. Substring match
                if next_node == "FINISH" and "finish" not in low_node:
                    for a in enabled_agents:
                        aname = a.get("name", "").lower()
                        if aname in low_node or low_node in aname:
                            next_node = a.get("name")
                            break
            else:
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
            thought = data.get("thought") or extracted_thought or default_thought
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
        thought=extracted_thought or default_thought
    )

def supervisor_node(state: AgentState, config: RunnableConfig = None) -> dict:
    """Orchestrator node that checks progress against the checklist and routes to workers."""
    
    # Extract thread ID from config for telemetry tracing
    thread_id = config.get("configurable", {}).get("thread_id", "unknown_thread") if config else "unknown_thread"

    # Get 9Router client for this specific role
    llm = get_llm_client(role="Supervisor", temperature=state.get("temperature", 0.0))
    
    # Query active workplace agents
    enabled_agents = agent_manager.get_enabled_agents()
    roster_lines = []
    agent_options = []
    for a in enabled_agents:
        a_name = a.get("name", "Worker")
        agent_options.append(f'"{a_name}"')
        a_title = a.get("title", "")
        a_desc = a.get("description", "")
        a_tools = ", ".join(a.get("tools", [])) or "No tools"
        roster_lines.append(f"- '{a_name}' ({a_title}): {a_desc} [Tools: {a_tools}]")
    
    roster_section = "\n".join(roster_lines) if roster_lines else "- None (Answer directly)"
    options_str = f"{' | '.join(agent_options)} | \"FINISH\"" if agent_options else "\"FINISH\""

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

    now_str = datetime.now().strftime("%A, %B %d, %Y %H:%M:%S")

    system_prompt = f"""You are the Supervisor (Orchestrator) for the BLUDAI Multi-Agent Workplace.
Your job is to coordinate the active specialist agents in the workplace to fulfill the user's request.

[SYSTEM CONTEXT]:
- Current Date and Time: {now_str}

Available Specialists in this Workplace:
{roster_section}

Operational Guidelines:
1. Fast-Path / Direct Answers: If the user's request is a direct question, greeting, general knowledge inquiry, or can be answered using the provided system context (such as current date and time), facts, or memory, DO NOT delegate to workers. Immediately set `next_node` to 'FINISH' and write the complete answer in `instruction`.
2. Multi-step Tasks: Break down complex requests into a checklist of subtasks and track them in `checklist`.
3. Inspect message history and tools output. Mark tasks as completed [x] or pending [ ].
4. Delegate to the appropriate specialist based on role and tools:
   - Select one of the available specialists: {options_str}.
   - Choose 'FINISH' when all tasks are complete or when you can answer the user directly.
5. Web Research: When the user asks for live internet news, recent releases, current benchmarks, external documentation, or real-time web information, delegate directly to 'Researcher' (who has 'web_search'). NEVER instruct Executor to run terminal commands for dates or internet searches.
6. Terminal Commands: Only delegate to 'Executor' for actual codebase commands, running tests, compiling, or installing packages. Never use Executor to find the current date or time (use the system context above).

RESPONSE FORMAT:
You MUST respond with a JSON object conforming to this schema:
{{
  "thought": "Your internal analysis and reasoning on current state and next step",
  "updated_checklist": "The updated checklist string (e.g. [x] Step 1\\n[ ] Step 2)",
  "next_node": {options_str},
  "instruction": "Detailed instruction for specialist, OR final user response if next_node is FINISH"
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
            
        native_reasoning = (
            getattr(raw_res, "additional_kwargs", {}).get("reasoning_content") or
            (raw_res.response_metadata.get("message", {}).get("reasoning_content") if hasattr(raw_res, "response_metadata") else None)
        )
        response = parse_supervisor_response(raw_content, enabled_agents=enabled_agents, default_thought=native_reasoning)
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
    if response.thought and response.thought.strip():
        new_messages.append(AIMessage(
            content=f"⚡ **Thinking · Supervisor**:\n{response.thought.strip()}",
            additional_kwargs={"agent": "Supervisor", "reasoning_content": response.thought.strip()}
        ))

    if next_node == "FINISH":
        new_messages.append(AIMessage(content=instruction, additional_kwargs={"agent": "Supervisor"}))
    else:
        # Append Supervisor's delegation instruction to direct the worker
        new_messages.append(SystemMessage(content=f"[Supervisor Instruction for {next_node}]: {instruction}"))
        
    emit_semantic_event(
        thread_id=thread_id,
        event_type="agent_delegation",
        node="Supervisor",
        content=instruction,
        metadata={"next_node": next_node, "updated_checklist": updated_checklist, "thought": response.thought}
    )

    return {
        "messages": new_messages,
        "checklist": updated_checklist,
        "next": next_node
    }
