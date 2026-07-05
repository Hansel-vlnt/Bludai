import sqlite3
import os
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.store.memory import InMemoryStore

DB_PATH = os.path.join(os.path.expanduser("~"), ".bludai_checkpoints.db")
_conn = sqlite3.connect(DB_PATH, check_same_thread=False)

# Singleton instances for memory components
_checkpointer = SqliteSaver(_conn)
_checkpointer.setup()

_store = InMemoryStore()

def get_checkpointer():
    """Returns the checkpointer for thread-scoped short-term memory (Chat History)."""
    return _checkpointer

def get_store():
    """Returns the store for cross-thread long-term memory (Facts/Entities)."""
    return _store
