import os
from pathlib import Path
from langchain_core.messages import SystemMessage, HumanMessage
from bludai.core.llm_client import get_llm_client

from bludai.core.memory import get_checkpointer
from bludai.core.skills_manager import skills_manager

def extract_and_save_skill(skill_name: str, state_ctx) -> tuple[bool, str]:
    """
    Takes the conversation history from state_ctx or checkpointer, distills it using an LLM,
    and writes it as a new SKILL.md under skills/<skill_name>/
    """
    messages_list = []
    
    # Try retrieving messages from LangGraph checkpointer
    if hasattr(state_ctx, "thread_id") and state_ctx.thread_id:
        checkpointer = get_checkpointer()
        config = {"configurable": {"thread_id": state_ctx.thread_id}}
        state = checkpointer.get(config)
        if state and "channel_values" in state:
            messages_list = state["channel_values"].get("messages", [])
            
    if not messages_list and hasattr(state_ctx, "basic_messages"):
        messages_list = state_ctx.basic_messages

    if not messages_list:
        return False, "No conversation history found to extract a skill from."

    llm = get_llm_client(role="Extractor", temperature=state.get(\'temperature\', 0.0))
    
    # Format messages for the extractor LLM
    history_str = ""
    for msg in messages_list:
        msg_type = getattr(msg, "type", "message")
        msg_content = getattr(msg, "content", str(msg))
        role = "User" if msg_type == "human" else "Agent" if msg_type == "ai" else "System/Tool"
        history_str += f"{role}: {msg_content}\n"
        
    system_prompt = f"""You are the Skill Extractor node for the BLUDAI Multi-Agent System.
Your job is to analyze the conversation history and extract a reusable, general-purpose "Skill Playbook" that can teach future agents how to perform similar tasks.

Guidelines for the Skill Playbook:
1. It must contain YAML frontmatter at the very beginning, enclosed by triple-dashes (---).
2. The frontmatter must contain `name` (use '{skill_name}') and a short `description`.
3. The body of the playbook should be written in Markdown, outlining clear, step-by-step instructions, guidelines, and rules for a developer or executor agent to succeed at this task.
4. Keep instructions general enough to be reusable but specific enough to be actionable.

Example Format:
---
name: deployment_playbook
description: "Instructions for building and deploying python projects."
---
# Python Deployment Playbook

Guidelines:
1. Always check that requirements.txt is up to date.
2. ...
"""

    prompt = f"""Conversation History:
{history_str}

Please generate the skill playbook for '{skill_name}' now.
"""
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=prompt)
    ]
    
    try:
        response = llm.invoke(messages)
        content = response.content
        
        # Determine target directory from skills_manager
        target_dir = skills_manager.skills_dir / skill_name
        target_dir.mkdir(parents=True, exist_ok=True)
        
        skill_file = target_dir / "SKILL.md"
        with open(skill_file, "w", encoding="utf-8") as f:
            f.write(content)
            
        # Re-load skills
        skills_manager.load_all_skills()
        
        return True, f"Created skill playbook at skills/{skill_name}/SKILL.md and reloaded skills database."
        
    except Exception as e:
        return False, f"Failed to extract skill: {e}"
