import os
import yaml
from pathlib import Path

class SkillsManager:
    def __init__(self):
        # Locate the skills directory relative to this file
        self.skills_dir = Path(__file__).resolve().parent.parent / "skills"
        self.skills = {}

    def load_all_skills(self):
        """Scans the skills directory and loads all SKILL.md playbooks."""
        self.skills.clear()
        
        # Create directory if it doesn't exist
        if not self.skills_dir.exists():
            self.skills_dir.mkdir(parents=True, exist_ok=True)
            self._create_example_skill()
            
        for path in self.skills_dir.glob("**/SKILL.md"):
            try:
                skill_data = self.parse_skill_file(path)
                if skill_data:
                    name = skill_data.get("name")
                    if name:
                        self.skills[name] = skill_data
            except Exception:
                # Silently ignore broken skills during load
                pass

    def parse_skill_file(self, file_path: Path) -> dict:
        """Parses a SKILL.md file with YAML frontmatter."""
        content = file_path.read_text(encoding="utf-8")
        
        # Split on YAML frontmatter boundaries
        parts = content.split("---")
        if len(parts) >= 3:
            frontmatter_raw = parts[1]
            body = "---".join(parts[2:]).strip()
            
            try:
                metadata = yaml.safe_load(frontmatter_raw)
                if not isinstance(metadata, dict):
                    metadata = {}
                metadata["body"] = body
                metadata["path"] = str(file_path)
                if "name" not in metadata:
                    metadata["name"] = file_path.parent.name
                return metadata
            except Exception as e:
                raise ValueError(f"Failed to parse YAML frontmatter: {e}")
        return {}

    def list_skills(self) -> dict:
        """Returns a mapping of skill names to their descriptions."""
        return {name: info.get("description", "No description provided.") for name, info in self.skills.items()}

    def get_skill_system_prompt_addition(self) -> str:
        """Formats all loaded skills into a single system prompt instruction addition."""
        if not self.skills:
            return ""
        
        prompt_lines = ["\nAvailable Skills Playbooks:"]
        for name, info in self.skills.items():
            prompt_lines.append(f"### Skill: {name}")
            prompt_lines.append(f"Description: {info.get('description', '')}")
            prompt_lines.append(f"Instructions:\n{info.get('body', '')}\n")
        return "\n".join(prompt_lines)

    def _create_example_skill(self):
        """Creates a default example skill so the directory is not empty."""
        example_dir = self.skills_dir / "example_skill"
        example_dir.mkdir(parents=True, exist_ok=True)
        example_file = example_dir / "SKILL.md"
        
        content = """---
name: example_skill
description: "A placeholder skill that prints a welcome debug message."
version: 1.0.0
---
# Example Skill Guidelines

When running in example mode:
1. Greet the user with a friendly wave emoji (👋).
2. Let them know they have successfully loaded the skills engine.
"""
        example_file.write_text(content, encoding="utf-8")

skills_manager = SkillsManager()
