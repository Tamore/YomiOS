import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "yomi.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_memory_schema():
    with get_connection() as conn:
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

        # Seed initial permanent profile memories if not present
        initial_memories = [
            ("profile", "user_name", "Nirmiti Ramesh Tamore"),
            ("profile", "education", "B.Tech in Computer Science and Engineering (2024), Sandip University, First Class with Distinction, 7.81/10 CGPA"),
            ("research", "core_focus", "Distributed Systems, Self-Adaptive Autonomous Systems, Decentralized Consensus, Edge Computing, Agentic Workflows"),
            ("research", "preprints", "4 Zenodo preprints deposited on distributed consensus and adaptive decentralized architectures"),
            ("research", "flagship_systems", "SkillMesh (Decentralized skill protocol), Yomi OS 2.0 (Executive AI Assistant & Research Satellite)"),
            ("university", "sit_status", "Shibaura Institute of Technology (Prof. Hiroaki Fukuda): Export control review email submitted Nov 6, 2026; awaiting pre-consultation approval on TAO"),
            ("university", "waseda_ips_status", "Waseda IPS Kitakyushu (Prof. Shigeru Fujimura): Application window opens Dec 7-18, 2026"),
            ("university", "naist_status", "NAIST (Prof. Michiko Inoue): Pre-screening window closes Dec 8, 2026"),
            ("university", "science_tokyo_status", "Science Tokyo / Tokyo Tech (Prof. Kenji Tei, Prof. Xavier Défago): IGP(C) window opens Jan 2027"),
            ("university", "ritsumeikan_status", "Ritsumeikan University FREX Masterclass: Confirmed for Nov 28, 2026 at 5:30 PM IST with Prof. Shinichi Nakasuka")
        ]
        for cat, k, v in initial_memories:
            cursor.execute("""
                INSERT OR IGNORE INTO memories (category, key, value)
                VALUES (?, ?, ?)
            """, (cat, k, v))
        conn.commit()

def remember(key: str, value: str, category: str = "fact", confidence: float = 1.0):
    with get_connection() as conn:
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
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM memories WHERE key = ?", (key,))
        row = cursor.fetchone()
        return row["value"] if row else None

def search_memories(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        pattern = f"%{query}%"
        cursor.execute("""
            SELECT category, key, value, updated_at FROM memories
            WHERE key LIKE ? OR value LIKE ? OR category LIKE ?
            ORDER BY updated_at DESC LIMIT ?
        """, (pattern, pattern, pattern, limit))
        return [dict(r) for r in cursor.fetchall()]

def get_all_memories() -> List[Dict[str, Any]]:
    with get_connection() as conn:
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
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO conversation_history (session_id, role, content, tool_calls)
            VALUES (?, ?, ?, ?)
        """, (session_id, role, content, tool_calls))
        conn.commit()

def get_recent_chat(session_id: str = "default", limit: int = 8) -> List[Dict[str, str]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT role, content FROM conversation_history
            WHERE session_id = ?
            ORDER BY id DESC LIMIT ?
        """, (session_id, limit))
        rows = cursor.fetchall()
        # Return in chronological order
        return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]

# Initialize on module load
init_memory_schema()

