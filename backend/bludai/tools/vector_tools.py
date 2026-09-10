from langchain_core.tools import tool
from bludai.core.vector_store import vector_store

@tool
def semantic_code_search(query: str, limit: int = 4) -> str:
    """
    Searches the project codebase using semantic vector embeddings.
    Use this to locate functions, components, API endpoints, state management, or UI styling
    based on concept, intent, or meaning rather than exact filenames.
    """
    matches = vector_store.search_code(query, n_results=limit)
    if not matches:
        return "No relevant code snippets found in the vector index. You may need to run index_project_codebase."

    results = []
    for m in matches:
        header = f"=== File: {m['filepath']} (Lines {m['start_line']}-{m['end_line']}) | Similarity: {m['similarity']} ==="
        results.append(header)
        results.append(m['content'])
        results.append("")
    return "\n".join(results)

@tool
def index_project_codebase(path: str = ".") -> str:
    """
    Scans the project files and generates vector embeddings to update the semantic code search index.
    Call this when new files have been created or modified significantly.
    """
    res = vector_store.index_codebase(path)
    return f"Successfully indexed {res.get('files', 0)} files into {res.get('chunks', 0)} vector embeddings in ChromaDB."

vector_tools = [semantic_code_search, index_project_codebase]
