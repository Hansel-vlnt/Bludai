import os
import json
import glob
import time
import subprocess
import concurrent.futures
from contextvars import ContextVar
from typing import Optional, List, Dict, Tuple, Any

from bludai.core.skills_manager import skills_manager

def safe_join_and_resolve(base: str, subpath: str) -> str:
    resolved = os.path.normpath(os.path.join(base, subpath))
    try:
        common = os.path.commonpath([os.path.normpath(base), resolved])
        if os.path.normcase(common) != os.path.normcase(os.path.normpath(base)):
            raise ValueError("Access denied: path is outside the workspace.")
    except ValueError as e:
        if "drive" in str(e).lower() or "access denied" in str(e).lower():
            raise ValueError("Access denied: path is outside the workspace.")
        raise
    return resolved

class WorkspaceManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init()
        return cls._instance

    def _init(self):
        default_ws = os.environ.get("BLUDAI_WORKSPACE_ROOT") or "d:/Bludai"
        if not os.path.exists(default_ws):
            default_ws = os.getcwd()
        self._active_workspace = os.path.normpath(os.path.abspath(default_ws)).replace("\\", "/")
            
        self._recent_file = os.path.join(os.path.expanduser("~"), ".bludai_workspaces.json")
        self.active_workspace_ctx = ContextVar("active_workspace_ctx", default=None)
        # Ensure initial active workspace is recorded in recent list
        self._update_recent_workspaces(self._active_workspace)

    def set_active_workspace(self, path: str) -> dict:
        norm_path = os.path.normpath(os.path.abspath(os.path.expanduser(path))).replace("\\", "/")
        if not (os.path.exists(norm_path) and os.path.isdir(norm_path)):
            raise ValueError(f"Invalid workspace path: {norm_path}")
            
        self._active_workspace = norm_path
        self._update_recent_workspaces(norm_path)
        skills_manager.load_all_skills()
        return self.get_active_workspace()

    def _update_recent_workspaces(self, path: str):
        recent_workspaces = []
        if os.path.exists(self._recent_file):
            try:
                with open(self._recent_file, "r", encoding="utf-8") as f:
                    recent_workspaces = json.load(f)
            except Exception:
                pass
                
        # Remove existing if present (case-insensitive & slash-insensitive on windows)
        norm_target = os.path.normcase(os.path.normpath(path))
        recent_workspaces = [w for w in recent_workspaces if os.path.normcase(os.path.normpath(w.get("path", ""))) != norm_target]
        
        # Add new at the top
        clean_path = os.path.normpath(os.path.abspath(path)).replace("\\", "/")
        recent_workspaces.insert(0, {
            "path": clean_path,
            "last_opened": time.time()
        })
        
        # Keep top 15
        recent_workspaces = recent_workspaces[:15]
        
        try:
            with open(self._recent_file, "w", encoding="utf-8") as f:
                json.dump(recent_workspaces, f)
        except Exception:
            pass

    def get_recent_workspaces(self) -> List[dict]:
        recent_workspaces = []
        if os.path.exists(self._recent_file):
            try:
                with open(self._recent_file, "r", encoding="utf-8") as f:
                    recent_workspaces = json.load(f)
            except Exception:
                pass

        results = []
        for item in recent_workspaces:
            p = item.get("path")
            if not p or not os.path.exists(p):
                continue
            clean_p = os.path.normpath(p).replace("\\", "/")
            is_git, git_branch, _ = self.get_git_info(p)
            last_opened = item.get("last_opened", 0)

            diff = max(0, int(time.time() - last_opened))
            if diff < 60:
                rel_time = "just now"
            elif diff < 3600:
                rel_time = f"{diff // 60}m ago"
            elif diff < 86400:
                rel_time = f"{diff // 3600}h ago"
            else:
                rel_time = f"{diff // 86400}d ago"

            results.append({
                "path": clean_p,
                "name": os.path.basename(clean_p) or clean_p,
                "is_git": is_git,
                "git_branch": git_branch,
                "last_opened": last_opened,
                "relative_time": rel_time
            })
        return results

    def remove_recent_workspace(self, path: str) -> List[dict]:
        recent_workspaces = []
        if os.path.exists(self._recent_file):
            try:
                with open(self._recent_file, "r", encoding="utf-8") as f:
                    recent_workspaces = json.load(f)
            except Exception:
                pass
        norm_target = os.path.normcase(os.path.normpath(path))
        recent_workspaces = [w for w in recent_workspaces if os.path.normcase(os.path.normpath(w.get("path", ""))) != norm_target]
        try:
            with open(self._recent_file, "w", encoding="utf-8") as f:
                json.dump(recent_workspaces, f)
        except Exception:
            pass
        return self.get_recent_workspaces()

    def count_files(self, target_path: str) -> int:
        prune_dirs = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build", ".cache"}
        count = 0
        try:
            for root, dirs, files in os.walk(target_path):
                dirs[:] = [d for d in dirs if d not in prune_dirs]
                count += len(files)
                if count > 10000:
                    break
        except Exception:
            pass
        return count

    def read_file_content(self, target_file_path: str) -> dict:
        base = self.get_active_path()
        full_path = safe_join_and_resolve(base, target_file_path) if not os.path.isabs(target_file_path) else os.path.normpath(target_file_path)
        try:
            common = os.path.commonpath([os.path.normpath(base), os.path.normpath(full_path)])
            if os.path.normcase(common) != os.path.normcase(os.path.normpath(base)):
                raise ValueError("Access denied: path is outside the workspace.")
        except Exception:
            raise ValueError("Access denied: path is outside the workspace.")

        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File not found: {target_file_path}")
        if os.path.isdir(full_path):
            raise ValueError(f"Path is a directory: {target_file_path}")

        size = os.path.getsize(full_path)
        try:
            with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read(262144)
        except Exception as e:
            content = f"Error reading file: {e}"

        rel_path = os.path.relpath(full_path, base).replace("\\", "/")
        return {
            "name": os.path.basename(full_path),
            "path": rel_path,
            "size": size,
            "content": content
        }

    def get_active_workspace(self) -> dict:
        target_path = self.get_active_path()
        name = os.path.basename(target_path) or target_path
        is_git, git_branch, is_clean = self.get_git_info(target_path)
        
        rules_xml = self.scan_project_rules(target_path)
        # Extract rules list just for the summary (heuristic: count <RULE[...]>)
        rules_summary = []
        for line in rules_xml.split('\n'):
            if line.startswith("<RULE["):
                rules_summary.append(line[6:-2])
        rules_count = len(rules_summary)
        skills_count = len(skills_manager.skills)
        files_count = self.count_files(target_path)
        
        return {
            "path": target_path.replace("\\", "/"),
            "name": name,
            "is_git": is_git,
            "git_branch": git_branch,
            "git_is_clean": is_clean,
            "rules_count": rules_count,
            "rules_summary": rules_summary,
            "files_count": files_count,
            "skills_count": skills_count
        }

    def get_active_path(self) -> str:
        ctx_path = self.active_workspace_ctx.get()
        if ctx_path:
            return ctx_path
        return self._active_workspace

    def get_git_info(self, target_path: Optional[str] = None) -> Tuple[bool, Optional[str], bool]:
        if target_path is None:
            target_path = self.get_active_path()
            
        git_dir = os.path.join(target_path, ".git")
        if not (os.path.exists(git_dir) and os.path.isdir(git_dir)):
            return False, None, True
            
        head_file = os.path.join(git_dir, "HEAD")
        branch = None
        if os.path.exists(head_file):
            try:
                with open(head_file, "r") as f:
                    content = f.read().strip()
                if content.startswith("ref: "):
                    branch = content.split("/")[-1]
                elif len(content) == 40: # detached head, commit hash
                    branch = content[:7]
            except Exception:
                pass
                
        # fallback to git CLI
        if not branch:
            try:
                result = subprocess.run(
                    ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                    cwd=target_path,
                    capture_output=True,
                    text=True,
                    timeout=1
                )
                if result.returncode == 0:
                    branch = result.stdout.strip()
            except Exception:
                pass

        # Check clean / dirty status
        is_clean = True
        try:
            status_res = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=target_path,
                capture_output=True,
                text=True,
                timeout=1
            )
            if status_res.returncode == 0:
                is_clean = len(status_res.stdout.strip()) == 0
        except Exception:
            pass
            
        return True, branch, is_clean

    def scan_project_rules(self, target_path: Optional[str] = None) -> str:
        if target_path is None:
            target_path = self.get_active_path()
            
        search_patterns = [
            ".agents/rules/*.md",
            ".agents/rules/*.markdown",
            ".cursorrules",
            ".cursor/rules/*.mdc",
            "AGENTS.md",
            "CLAUDE.md"
        ]
        
        matched_files = []
        for pattern in search_patterns:
            matches = sorted(glob.glob(pattern, root_dir=target_path))
            for m in matches:
                full_path = os.path.join(target_path, m)
                if os.path.isfile(full_path):
                    matched_files.append(full_path)
                    
        if not matched_files:
            return ""
            
        project_name = os.path.basename(target_path) or target_path
        lines = [
            "<user_rules>",
            f"The following are project-defined rules for this workspace ({project_name}):"
        ]
        
        for mf in matched_files:
            rel_path = os.path.relpath(mf, target_path)
            rel_path = rel_path.replace("\\", "/") # standardize to forward slash
            try:
                with open(mf, "r", encoding="utf-8") as f:
                    content = f.read()
                lines.append(f"<RULE[{rel_path}]>")
                lines.append(content)
                lines.append(f"</RULE[{rel_path}]>")
            except Exception:
                pass
                
        lines.append("</user_rules>")
        return "\n".join(lines)

    def get_directory_tree(self, subpath: str = "", max_depth: int = 1) -> dict:
        target_path = self.get_active_path()
        if subpath:
            target_path = safe_join_and_resolve(target_path, subpath)
            
        def build_tree(path, depth):
            if depth > max_depth:
                return None
            try:
                items = os.listdir(path)
            except (PermissionError, OSError):
                return []
                
            prune_dirs = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build", ".cache"}
            
            dirs = []
            files = []
            for item in items:
                if item in prune_dirs:
                    continue
                item_path = os.path.join(path, item)
                rel_path = os.path.relpath(item_path, self.get_active_path())
                rel_path = rel_path.replace("\\", "/")
                is_dir = os.path.isdir(item_path)
                
                try:
                    size = os.path.getsize(item_path) if not is_dir else 0
                except OSError:
                    size = 0
                    
                node = {
                    "name": item,
                    "path": rel_path,
                    "type": "directory" if is_dir else "file",
                    "size": size,
                    "has_children": False
                }
                
                if is_dir:
                    try:
                        node["has_children"] = bool(os.listdir(item_path))
                    except OSError:
                        pass
                    if depth < max_depth:
                        children = build_tree(item_path, depth + 1)
                        if children is not None:
                            node["children"] = children
                    dirs.append(node)
                else:
                    files.append(node)
                    
            dirs.sort(key=lambda x: x["name"].lower())
            files.sort(key=lambda x: x["name"].lower())
            
            return dirs + files

        active_path = self.get_active_path()
        rel_root = os.path.relpath(target_path, active_path) if os.path.normcase(target_path) != os.path.normcase(active_path) else ""
        rel_root = rel_root.replace("\\", "/")
        
        return {
            "name": os.path.basename(target_path) or target_path,
            "path": rel_root if rel_root != "." else "",
            "type": "directory",
            "has_children": True,
            "children": build_tree(target_path, 1)
        }

    def browse_local_directories(self, parent_path: Optional[str] = None) -> List[dict]:
        if not parent_path:
            if os.name == 'nt':
                drives = []
                import string
                for letter in string.ascii_uppercase:
                    drive = f"{letter}:\\"
                    if os.path.exists(drive):
                        drives.append({
                            "name": drive,
                            "path": drive.replace("\\", "/"),
                            "type": "directory",
                            "has_children": True
                        })
                return drives
            else:
                parent_path = "/"
            
        cleaned_path = parent_path.strip().replace("/", "\\") if os.name == 'nt' else parent_path.strip()
        if os.name == 'nt' and len(cleaned_path) == 2 and cleaned_path[1] == ':':
            cleaned_path = cleaned_path + "\\"

        norm_path = os.path.normpath(os.path.abspath(os.path.expanduser(cleaned_path)))

        search_dir = norm_path
        prefix_filter = ""

        if not (os.path.exists(norm_path) and os.path.isdir(norm_path)):
            parent_dir = os.path.dirname(norm_path)
            prefix_filter = os.path.basename(norm_path).lower()
            if os.path.exists(parent_dir) and os.path.isdir(parent_dir):
                search_dir = parent_dir
            else:
                return []

        results = []
        try:
            items = os.listdir(search_dir)
            for item in items:
                if prefix_filter and not item.lower().startswith(prefix_filter):
                    continue
                item_path = os.path.join(search_dir, item)
                if os.path.isdir(item_path):
                    try:
                        has_children = bool(os.listdir(item_path))
                    except OSError:
                        has_children = False
                    results.append({
                        "name": item,
                        "path": item_path.replace("\\", "/"),
                        "type": "directory",
                        "has_children": has_children
                    })
        except OSError:
            pass
            
        results.sort(key=lambda x: x["name"].lower())
        return results

    def _askdirectory_worker(self):
        try:
            import tkinter as tk
            from tkinter import filedialog
            root = tk.Tk()
            root.withdraw()
            root.attributes('-topmost', True)
            root.update()
            path = filedialog.askdirectory(parent=root)
            root.destroy()
            return path.replace("\\", "/") if path else None
        except Exception:
            return None

    def open_native_dialog(self) -> Optional[str]:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(self._askdirectory_worker)
            try:
                return future.result(timeout=300)
            except concurrent.futures.TimeoutError:
                return None

workspace_manager = WorkspaceManager()
