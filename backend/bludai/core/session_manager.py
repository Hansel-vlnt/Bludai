import sqlite3
import datetime
import os

DB_PATH = os.path.join(os.path.expanduser("~"), ".bludai_sessions.db")

class SessionManager:
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path
        self.init_db()
        
    def init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    thread_id TEXT PRIMARY KEY,
                    title TEXT,
                    mode TEXT,
                    updated_at TIMESTAMP
                )
            ''')
            
    def create_or_update_session(self, thread_id: str, title: str, mode: str):
        now = datetime.datetime.now().isoformat()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO sessions (thread_id, title, mode, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(thread_id) DO UPDATE SET
                    updated_at=excluded.updated_at
            ''', (thread_id, title, mode, now))
            
    def update_timestamp(self, thread_id: str):
        now = datetime.datetime.now().isoformat()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                UPDATE sessions SET updated_at = ? WHERE thread_id = ?
            ''', (now, thread_id))
            
    def get_sessions(self, limit=20):
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute('''
                SELECT thread_id, title, mode, updated_at
                FROM sessions
                ORDER BY updated_at DESC
                LIMIT ?
            ''', (limit,))
            return [dict(row) for row in cur.fetchall()]
            
    def get_session(self, thread_id: str):
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute('SELECT * FROM sessions WHERE thread_id = ?', (thread_id,))
            row = cur.fetchone()
            if row:
                return dict(row)
            return None

session_manager = SessionManager()
