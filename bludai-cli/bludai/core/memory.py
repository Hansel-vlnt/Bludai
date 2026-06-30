from langgraph.checkpoint.memory import MemorySaver
from langgraph.store.memory import InMemoryStore

# Singleton instances for memory components
# To persist across restarts, these can be swapped with SqliteSaver and SqliteStore
_checkpointer = MemorySaver()
_store = InMemoryStore()

def get_checkpointer():
    """Returns the checkpointer for thread-scoped short-term memory (Chat History)."""
    return _checkpointer

def get_store():
    """Returns the store for cross-thread long-term memory (Facts/Entities)."""
    return _store
