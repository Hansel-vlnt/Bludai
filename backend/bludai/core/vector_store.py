import os
import glob
from pathlib import Path
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.utils import embedding_functions

# Vector store storage directory (isolated and ignored)
VECTOR_DB_DIR = os.path.join(os.path.expanduser("~"), ".bludai_vectors")

# Extensions to index for semantic code search
SUPPORTED_EXTENSIONS = {
    ".py": "python",
    ".jsx": "javascript",
    ".js": "javascript",
    ".css": "css",
    ".html": "html",
    ".md": "markdown",
    ".json": "json",
    ".toml": "toml",
    ".sh": "bash",
    ".bat": "batch",
    ".ps1": "powershell"
}

# Directories and patterns to strictly ignore
IGNORED_PATTERNS = {
    ".git", ".venv", "env", "venv", "node_modules", "dist", "build",
    "__pycache__", ".cache", ".idea", ".vscode", "9router", "hermes-agent",
    "openclaw", ".bludai_history", "package-lock.json"
}

class VectorStoreManager:
    def __init__(self, persist_dir: str = VECTOR_DB_DIR):
        self.persist_dir = persist_dir
        os.makedirs(self.persist_dir, exist_ok=True)
        
        # Initialize embedded persistent Chroma client
        self.client = chromadb.PersistentClient(path=self.persist_dir)
        
        # Use fast, local, offline-capable MiniLM embeddings
        self.embed_fn = embedding_functions.DefaultEmbeddingFunction()
        
        # 1. Codebase collection for semantic code search (Code RAG)
        self.code_coll = self.client.get_or_create_collection(
            name="bludai_codebase",
            embedding_function=self.embed_fn,
            metadata={"hnsw:space": "cosine"}
        )
        
        # 2. Semantic memory collection for cross-session facts and rules
        self.memory_coll = self.client.get_or_create_collection(
            name="bludai_semantic_memory",
            embedding_function=self.embed_fn,
            metadata={"hnsw:space": "cosine"}
        )

    def _chunk_file(self, file_path: str, root_dir: str) -> List[Dict[str, Any]]:
        """Splits a source file into logical chunks with line number metadata."""
        chunks = []
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
        except Exception:
            return chunks

        if not lines:
            return chunks

        rel_path = os.path.relpath(file_path, root_dir).replace("\\", "/")
        ext = os.path.splitext(file_path)[1].lower()
        language = SUPPORTED_EXTENSIONS.get(ext, "text")

        chunk_size = 40  # ~40 lines per chunk
        overlap = 10     # 10 lines overlap for context continuity

        total_lines = len(lines)
        start = 0

        while start < total_lines:
            end = min(start + chunk_size, total_lines)
            chunk_lines = lines[start:end]
            chunk_text = "".join(chunk_lines).strip()

            if chunk_text:
                header = f"// File: {rel_path} (Lines {start + 1}-{end})\n"
                doc_text = header + chunk_text
                chunk_id = f"{rel_path}:{start + 1}-{end}"

                chunks.append({
                    "id": chunk_id,
                    "text": doc_text,
                    "metadata": {
                        "filepath": rel_path,
                        "start_line": start + 1,
                        "end_line": end,
                        "language": language
                    }
                })

            if end >= total_lines:
                break
            start += (chunk_size - overlap)

        return chunks

    def index_codebase(self, root_dir: Optional[str] = None) -> Dict[str, Any]:
        """Scans the project directory and indexes code into the vector store."""
        if not root_dir:
            # Default to Bludai project root (2 levels up from this file)
            root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

        all_chunks = []
        indexed_files = 0

        for root, dirs, files in os.walk(root_dir):
            # Prune ignored directories in-place
            dirs[:] = [d for d in dirs if d not in IGNORED_PATTERNS and not d.startswith(".")]

            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in SUPPORTED_EXTENSIONS and file not in IGNORED_PATTERNS and not file.startswith("."):
                    file_path = os.path.join(root, file)
                    chunks = self._chunk_file(file_path, root_dir)
                    if chunks:
                        all_chunks.extend(chunks)
                        indexed_files += 1

        if not all_chunks:
            return {"status": "success", "files": 0, "chunks": 0}

        # Clear existing code index to keep it fresh
        try:
            self.client.delete_collection("bludai_codebase")
            self.code_coll = self.client.get_or_create_collection(
                name="bludai_codebase",
                embedding_function=self.embed_fn,
                metadata={"hnsw:space": "cosine"}
            )
        except Exception:
            pass

        # Insert in batches of 100
        batch_size = 100
        total_chunks = len(all_chunks)
        for i in range(0, total_chunks, batch_size):
            batch = all_chunks[i:i + batch_size]
            self.code_coll.add(
                ids=[c["id"] for c in batch],
                documents=[c["text"] for c in batch],
                metadatas=[c["metadata"] for c in batch]
            )

        return {
            "status": "success",
            "files": indexed_files,
            "chunks": total_chunks,
            "root_dir": root_dir
        }

    def search_code(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Performs semantic similarity search against the indexed codebase."""
        if self.code_coll.count() == 0:
            return []

        results = self.code_coll.query(
            query_texts=[query],
            n_results=min(n_results, self.code_coll.count())
        )

        formatted = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0]
            ids = results["ids"][0]
            distances = results.get("distances", [[]])[0]

            for i in range(len(docs)):
                formatted.append({
                    "id": ids[i],
                    "filepath": metas[i].get("filepath"),
                    "start_line": metas[i].get("start_line"),
                    "end_line": metas[i].get("end_line"),
                    "language": metas[i].get("language"),
                    "content": docs[i],
                    "similarity": round(1.0 - (distances[i] if i < len(distances) else 0.0), 3)
                })

        return formatted

    def add_memory(self, content: str, category: str = "project_fact") -> str:
        """Stores a piece of semantic memory."""
        import uuid
        import datetime
        mem_id = f"mem_{uuid.uuid4().hex[:8]}"
        self.memory_coll.add(
            ids=[mem_id],
            documents=[content],
            metadatas=[{
                "category": category,
                "timestamp": datetime.datetime.now().isoformat()
            }]
        )
        return mem_id

    def search_memory(self, query: str, n_results: int = 3) -> List[str]:
        """Queries semantic memory and returns matching facts/preferences."""
        if self.memory_coll.count() == 0:
            return []

        results = self.memory_coll.query(
            query_texts=[query],
            n_results=min(n_results, self.memory_coll.count())
        )

        if results and "documents" in results and results["documents"]:
            return results["documents"][0]
        return []

    def get_stats(self) -> Dict[str, Any]:
        """Returns statistics about current vector collections."""
        return {
            "codebase_chunks": self.code_coll.count(),
            "semantic_memories": self.memory_coll.count(),
            "storage_path": self.persist_dir
        }

vector_store = VectorStoreManager()
