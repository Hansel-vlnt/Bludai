import sqlite3
import os
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.store.sqlite import SqliteStore

DB_PATH = os.path.join(os.path.expanduser("~"), ".bludai_checkpoints.db")

_cp_conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=30.0)
_cp_conn.execute("PRAGMA journal_mode=WAL;")
_checkpointer = SqliteSaver(_cp_conn)
_checkpointer.setup()

_store_conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=30.0)
_store = SqliteStore(_store_conn)
_store.setup()

def get_checkpointer():
    """Returns the checkpointer for thread-scoped short-term memory (Chat History)."""
    return _checkpointer

def get_store():
    """Returns the store for cross-thread long-term memory (Facts/Entities)."""
    return _store
