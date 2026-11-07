import sqlite3
import json
import os
import uuid
import time
from datetime import datetime
from typing import List, Dict, Any, Optional

from config import WORKSPACE_ROOT

DB_PATH = WORKSPACE_ROOT / "tasks.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Life Domains
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS domains (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 2. Projects & Roadmaps
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        domain_id TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT DEFAULT 'Active',
        progress INTEGER DEFAULT 0,
        target_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
    )
    """)
    
    # 3. Tasks
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        domain_id TEXT,
        project_id TEXT,
        title TEXT NOT NULL,
        priority TEXT DEFAULT 'P3',
        status TEXT DEFAULT 'Pending',
        is_completed INTEGER DEFAULT 0,
        due_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
    """)
    
    # 4. Activity Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        icon TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 5. Web Summaries & Exported PDFs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS web_summaries (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        pdf_path TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 6. Autonomous Sub-Agents (Meta-Agent Factory)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subagents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        prompt_template TEXT NOT NULL,
        tools_bound TEXT NOT NULL,
        schedule TEXT DEFAULT 'manual',
        status TEXT DEFAULT 'IDLE',
        last_run TEXT,
        last_output TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    conn.commit()
    
    conn.close()

# CRUD Helpers
def get_all_domains() -> List[Dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM domains ORDER BY created_at ASC").fetchall()
    result = [dict(row) for row in rows]
    conn.close()
    return result

def get_all_projects() -> List[Dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute("SELECT p.*, d.name as domain_name, d.color as domain_color FROM projects p JOIN domains d ON p.domain_id = d.id ORDER BY p.created_at DESC").fetchall()
    result = [dict(row) for row in rows]
    conn.close()
    return result

def get_all_tasks() -> List[Dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute("SELECT t.*, d.name as domain_name, p.title as project_title FROM tasks t LEFT JOIN domains d ON t.domain_id = d.id LEFT JOIN projects p ON t.project_id = p.id ORDER BY t.is_completed ASC, t.priority ASC, t.created_at DESC").fetchall()
    result = [dict(row) for row in rows]
    conn.close()
    return result

def get_activity_logs(limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    result = [dict(row) for row in rows]
    conn.close()
    return result

def add_log(title: str, description: str, category: str = "EXECUTION", icon: str = "activity"):
    conn = get_connection()
    log_id = f"act_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
    conn.execute("INSERT INTO activity_logs (id, title, description, category, icon) VALUES (?, ?, ?, ?, ?)",
                 (log_id, title, description, category, icon))
    conn.commit()
    conn.close()

def create_domain(name: str, icon: str = "folder", color: str = "#ffffff", description: str = "") -> Dict[str, Any]:
    conn = get_connection()
    dom_id = f"dom_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
    conn.execute("INSERT INTO domains (id, name, icon, color, description) VALUES (?, ?, ?, ?, ?)",
                 (dom_id, name, icon, color, description))
    conn.commit()
    conn.close()
    add_log("Domain Initialized", f"Partitioned new Life Domain: '{name}'", "STRATEGIC", "folder-plus")
    return {"id": dom_id, "name": name, "icon": icon, "color": color, "description": description}

def create_project(domain_id: str, title: str, target_date: Optional[str] = None) -> Dict[str, Any]:
    conn = get_connection()
    dom = conn.execute("SELECT id FROM domains WHERE id = ?", (domain_id,)).fetchone()
    if not dom:
        conn.close()
        raise ValueError(f"Domain '{domain_id}' does not exist.")
    proj_id = f"proj_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
    conn.execute("INSERT INTO projects (id, domain_id, title, status, progress, target_date) VALUES (?, ?, ?, 'Active', 0, ?)",
                 (proj_id, domain_id, title, target_date))
    conn.commit()
    conn.close()
    add_log("Project Roadmap Started", f"Bootstrapped new roadmap: '{title}'", "ROADMAP", "map")
    return {"id": proj_id, "domain_id": domain_id, "title": title, "status": "Active", "progress": 0, "target_date": target_date}

def create_task(title: str, domain_id: Optional[str] = None, project_id: Optional[str] = None, priority: str = "P2", due_date: Optional[str] = None) -> Dict[str, Any]:
    conn = get_connection()
    if domain_id:
        dom = conn.execute("SELECT id FROM domains WHERE id = ?", (domain_id,)).fetchone()
        if not dom:
            conn.close()
            raise ValueError(f"Domain '{domain_id}' does not exist.")
    if project_id:
        proj = conn.execute("SELECT id FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not proj:
            conn.close()
            raise ValueError(f"Project '{project_id}' does not exist.")
    task_id = f"task_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
    conn.execute("INSERT INTO tasks (id, domain_id, project_id, title, priority, status, is_completed, due_date) VALUES (?, ?, ?, ?, ?, 'Pending', 0, ?)",
                 (task_id, domain_id, project_id, title, priority, due_date))
    conn.commit()
    conn.close()
    add_log("Task Deployed", f"Added actionable vector: '{title}'", "ACTION", "check-circle-2")
    return {"id": task_id, "title": title, "domain_id": domain_id, "project_id": project_id, "priority": priority, "is_completed": 0}

def toggle_task(task_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if not row:
        conn.close()
        return None
    new_status = 0 if row["is_completed"] == 1 else 1
    conn.execute("UPDATE tasks SET is_completed = ?, status = ? WHERE id = ?", 
                 (new_status, "Completed" if new_status == 1 else "Pending", task_id))
    conn.commit()
    updated = dict(conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone())
    conn.close()
    add_log("Task Updated", f"Marked task '{row['title']}' as {'Completed' if new_status else 'Reopened'}", "TASK", "check")
    return updated

def update_project_progress(project_id: str, progress: int):
    conn = get_connection()
    conn.execute("UPDATE projects SET progress = ? WHERE id = ?", (min(100, max(0, progress)), project_id))
    conn.commit()
    conn.close()

# -------------------------------------------------------------
# Sub-Agent Operations (Meta-Agent Factory)
# -------------------------------------------------------------

def create_subagent(name: str, role: str, prompt_template: str, tools_bound: List[str], schedule: str = "manual") -> Dict[str, Any]:
    conn = get_connection()
    agent_id = f"agent_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
    tools_json = json.dumps(tools_bound)
    conn.execute("""
        INSERT INTO subagents (id, name, role, prompt_template, tools_bound, schedule, status, last_run, last_output)
        VALUES (?, ?, ?, ?, ?, ?, 'IDLE', NULL, NULL)
    """, (agent_id, name, role, prompt_template, tools_json, schedule))
    conn.commit()
    conn.close()
    add_log("Sub-Agent Spawned", f"Meta-Agent instantiated '{name}' ({role})", "AGENT", "bot")
    return {
        "id": agent_id,
        "name": name,
        "role": role,
        "prompt_template": prompt_template,
        "tools_bound": tools_bound,
        "schedule": schedule,
        "status": "IDLE"
    }

def get_all_subagents() -> List[Dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM subagents ORDER BY created_at DESC").fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        try:
            d["tools_bound"] = json.loads(d.get("tools_bound") or "[]")
        except Exception:
            d["tools_bound"] = []
        result.append(d)
    return result

def get_subagent(agent_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM subagents WHERE id = ?", (agent_id,)).fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    try:
        d["tools_bound"] = json.loads(d.get("tools_bound") or "[]")
    except Exception:
        d["tools_bound"] = []
    return d

def update_subagent_status(agent_id: str, status: str, last_output: Optional[str] = None):
    conn = get_connection()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if last_output is not None:
        conn.execute("UPDATE subagents SET status = ?, last_run = ?, last_output = ? WHERE id = ?", 
                     (status, now_str, last_output, agent_id))
    else:
        conn.execute("UPDATE subagents SET status = ?, last_run = ? WHERE id = ?", 
                     (status, now_str, agent_id))
    conn.commit()
    conn.close()

def delete_subagent(agent_id: str) -> bool:
    conn = get_connection()
    cursor = conn.execute("DELETE FROM subagents WHERE id = ?", (agent_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    if deleted:
        add_log("Sub-Agent Decommissioned", f"Terminated worker sub-agent {agent_id}", "AGENT", "trash-2")
    return deleted

# -------------------------------------------------------------
# Global Cross-Project Memory Search (for MCP & Yomi Brain)
# -------------------------------------------------------------

def search_global_memory(query: str, limit: int = 10) -> Dict[str, Any]:
    conn = get_connection()
    like_q = f"%{query}%"
    
    # 1. Search tasks
    tasks = [dict(r) for r in conn.execute(
        "SELECT id, title, priority, status, created_at FROM tasks WHERE title LIKE ? ORDER BY created_at DESC LIMIT ?", 
        (like_q, limit)
    ).fetchall()]
    
    # 2. Search projects
    projects = [dict(r) for r in conn.execute(
        "SELECT id, title, status, progress, target_date FROM projects WHERE title LIKE ? ORDER BY created_at DESC LIMIT ?", 
        (like_q, limit)
    ).fetchall()]
    
    # 3. Search activity logs
    logs = [dict(r) for r in conn.execute(
        "SELECT id, title, description, category, created_at FROM activity_logs WHERE title LIKE ? OR description LIKE ? ORDER BY created_at DESC LIMIT ?", 
        (like_q, like_q, limit)
    ).fetchall()]
    
    # 4. Search subagents
    subagents = [dict(r) for r in conn.execute(
        "SELECT id, name, role, status FROM subagents WHERE name LIKE ? OR role LIKE ? OR prompt_template LIKE ? LIMIT ?", 
        (like_q, like_q, like_q, limit)
    ).fetchall()]
    
    conn.close()
    return {
        "query": query,
        "matched_tasks": tasks,
        "matched_projects": projects,
        "matched_logs": logs,
        "matched_subagents": subagents,
        "total_matches": len(tasks) + len(projects) + len(logs) + len(subagents)
    }

init_db()
