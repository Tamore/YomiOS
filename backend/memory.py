from contextlib import closing
import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

from config import WORKSPACE_ROOT

DB_PATH = WORKSPACE_ROOT / "memory.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_memory_schema():
    with closing(get_connection()) as conn, conn:
        cursor = conn.cursor()
        # Memories: Persistent knowledge facts about user, research, goals, preferences
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,  -- 'profile', 'research', 'university', 'preference', 'fact'
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                confidence REAL DEFAULT 1.0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Conversation history: For multi-turn context
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,      -- 'user', 'assistant', 'system', 'tool'
                content TEXT NOT NULL,
                tool_calls TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

def remember(key: str, value: str, category: str = "fact", confidence: float = 1.0):
    with closing(get_connection()) as conn, conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO memories (category, key, value, confidence, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
                value=excluded.value,
                category=excluded.category,
                confidence=excluded.confidence,
                updated_at=CURRENT_TIMESTAMP
        """, (category, key, value, confidence))
        conn.commit()

def recall(key: str) -> Optional[str]:
    with closing(get_connection()) as conn, conn:
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM memories WHERE key = ?", (key,))
        row = cursor.fetchone()
        return row["value"] if row else None

def search_memories(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    with closing(get_connection()) as conn, conn:
        cursor = conn.cursor()
        pattern = f"%{query}%"
        cursor.execute("""
            SELECT category, key, value, updated_at FROM memories
            WHERE key LIKE ? OR value LIKE ? OR category LIKE ?
            ORDER BY updated_at DESC LIMIT ?
        """, (pattern, pattern, pattern, limit))
        return [dict(r) for r in cursor.fetchall()]

def get_all_memories() -> List[Dict[str, Any]]:
    with closing(get_connection()) as conn, conn:
        cursor = conn.cursor()
        cursor.execute("SELECT category, key, value, updated_at FROM memories ORDER BY category, key")
        return [dict(r) for r in cursor.fetchall()]

def build_context_prompt() -> str:
    """Builds a compact context block of current user facts for the LLM."""
    memories = get_all_memories()
    if not memories:
        return ""
    lines = ["Relevant Context & User Profile:"]
    for m in memories:
        lines.append(f"- {m['key']} ({m['category']}): {m['value']}")
    return "\n".join(lines)

def append_chat(session_id: str, role: str, content: str, tool_calls: Optional[str] = None):
    with closing(get_connection()) as conn, conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO conversation_history (session_id, role, content, tool_calls)
            VALUES (?, ?, ?, ?)
        """, (session_id, role, content, tool_calls))
        conn.commit()

def get_recent_chat(session_id: str = "default", limit: int = 8) -> List[Dict[str, str]]:
    with closing(get_connection()) as conn, conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT role, content FROM conversation_history
            WHERE session_id = ?
            ORDER BY id DESC LIMIT ?
        """, (session_id, limit))
        rows = cursor.fetchall()
        # Return in chronological order
        return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]

def get_session_chat_history(session_id: str = "default", limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieves stored conversation messages for restoring chat state in UI."""
    with closing(get_connection()) as conn, conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, session_id, role, content, tool_calls, created_at
            FROM conversation_history
            WHERE session_id = ?
            ORDER BY id ASC LIMIT ?
        """, (session_id, limit))
        rows = cursor.fetchall()
        return [
            {
                "id": str(r["id"]),
                "role": r["role"],
                "content": r["content"],
                "tool_calls": r["tool_calls"],
                "timestamp": str(r["created_at"])
            }
            for r in rows
        ]

# Initialize on module load
init_memory_schema()

