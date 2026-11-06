import os
import sys
import json
import asyncio
from typing import Dict, Any, List, Optional

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import database as db
import meta_agent_factory as maf
from tools.os_control import get_system_telemetry

# Known registered projects and directories
WORKSPACE_DIR = os.path.abspath(os.path.join(BACKEND_DIR, "..", ".."))

REGISTERED_PROJECTS = {
    "yomi-assistant": os.path.abspath(os.path.join(BACKEND_DIR, "..")),
    "yomi-os": os.path.abspath(os.path.join(BACKEND_DIR, "..")),
    "japan-prep": os.path.join(WORKSPACE_DIR, "Japan Prep Temp"),
    "skillmesh": os.path.join(WORKSPACE_DIR, "SkillMesh"),
    "ai-editor": os.path.join(WORKSPACE_DIR, "AI Editor")
}

# -------------------------------------------------------------
# Tool Implementations
# -------------------------------------------------------------

def handle_get_project_context(project_name: str) -> str:
    key = project_name.lower().strip()
    matched_path = None
    for p_name, path in REGISTERED_PROJECTS.items():
        if key in p_name or p_name in key:
            matched_path = path
            break
            
    if not matched_path or not os.path.exists(matched_path):
        return f"Project '{project_name}' not found. Registered projects: {list(REGISTERED_PROJECTS.keys())}"

    # Extract README or key docs
    readme_content = ""
    for candidate in ["README.md", "readme.md", "README.txt"]:
        c_path = os.path.join(matched_path, candidate)
        if os.path.exists(c_path):
            with open(c_path, "r", encoding="utf-8", errors="ignore") as f:
                readme_content = f.read(2000)
            break

    # Get DB tasks and roadmaps matching this project
    tasks = db.search_global_memory(project_name, limit=5).get("matched_tasks", [])
    task_titles = [f"• [{t['priority']}] {t['title']} ({t['status']})" for t in tasks]

    context = (
        f"=== PROJECT CONTEXT: {project_name.upper()} ===\n"
        f"Path: {matched_path}\n\n"
        f"Active Tasks in Yomi Matrix:\n"
        f"{chr(10).join(task_titles) if task_titles else '• No specific tasks linked in active matrix.'}\n\n"
        f"Documentation Excerpt:\n{readme_content if readme_content else '(No README found at root)'}"
    )
    return context

def handle_search_global_memory(query: str) -> str:
    res = db.search_global_memory(query, limit=5)
    output = [f"=== YOMI GLOBAL MEMORY QUERY: '{query}' (Matches: {res['total_matches']}) ==="]
    
    if res.get("matched_tasks"):
        output.append("\n[Matched Tasks]:")
        for t in res["matched_tasks"]:
            output.append(f"• [{t['priority']}] {t['title']} (Status: {t['status']})")

    if res.get("matched_projects"):
        output.append("\n[Matched Roadmaps]:")
        for p in res["matched_projects"]:
            output.append(f"• {p['title']} - Progress: {p['progress']}% (Status: {p['status']})")

    if res.get("matched_logs"):
        output.append("\n[Recent Activity Logs]:")
        for l in res["matched_logs"]:
            output.append(f"• [{l['category']}] {l['title']}: {l['description']}")

    if res.get("matched_subagents"):
        output.append("\n[Active Sub-Agents]:")
        for a in res["matched_subagents"]:
            output.append(f"• {a['name']} ({a['role']}) - Status: {a['status']}")

    return "\n".join(output)

async def handle_spawn_subagent(prompt: str) -> str:
    ag = maf.spawn_subagent_from_prompt(prompt)
    return (
        f"Successfully spawned worker sub-agent!\n"
        f"ID: {ag['id']}\n"
        f"Name: {ag['name']}\n"
        f"Role: {ag['role']}\n"
        f"Tools Bound: {', '.join(ag['tools_bound'])}\n"
        f"Schedule: {ag['schedule']}"
    )

async def handle_execute_subagent(agent_id: str, context: Optional[str] = None) -> str:
    res = await maf.execute_subagent(agent_id, custom_input=context)
    if res["success"]:
        return f"Execution Succeeded for '{res['agent_name']}':\n{res['output']}"
    else:
        return f"Execution Failed for {agent_id}: {res.get('error')}"

def handle_get_telemetry() -> str:
    t = get_system_telemetry()
    return (
        f"=== HARDWARE & HOST TELEMETRY ===\n"
        f"OS: {t.get('os')} ({t.get('platform')})\n"
        f"CPU Utilization: {t.get('cpu_percent')}%\n"
        f"RAM Utilization: {t.get('ram_percent')}% ({t.get('ram_used_gb')}GB / {t.get('ram_total_gb')}GB)\n"
        f"Battery: {t.get('battery_percent')}% (Plugged in: {t.get('battery_plugged')})\n"
        f"Uptime: {t.get('uptime_hours')} hours\n"
        f"Timestamp: {t.get('timestamp')}"
    )

def handle_add_task(title: str, priority: str = "P2") -> str:
    task = db.create_task(title=title, priority=priority)
    return f"Created task in Yomi Matrix: [{task['priority']}] {task['title']} (ID: {task['id']})"

# -------------------------------------------------------------
# MCP Tool Declarations
# -------------------------------------------------------------

MCP_TOOLS = [
    {
        "name": "yomi_get_project_context",
        "description": "Fetch active schemas, roadmaps, and documentation across registered projects (SkillMesh, Japan Prep, Yomi OS).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "project_name": {
                    "type": "string",
                    "description": "Name of the project (e.g. 'yomi-os', 'japan-prep', 'skillmesh')"
                }
            },
            "required": ["project_name"]
        }
    },
    {
        "name": "yomi_search_global_memory",
        "description": "Search across Yomi OS persistent SQLite memory (tasks, roadmaps, activity logs, literature briefs).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search keyword or topic"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "yomi_spawn_subagent",
        "description": "Dynamically generate and spawn an autonomous worker sub-agent for literature research, web scraping, or telemetry monitoring.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Instruction describing the sub-agent's goal (e.g. 'Monitor papers by Xavier Défago')"
                }
            },
            "required": ["prompt"]
        }
    },
    {
        "name": "yomi_execute_subagent",
        "description": "Trigger execution of an existing worker sub-agent by ID.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "agent_id": {
                    "type": "string",
                    "description": "The unique ID of the sub-agent to execute"
                },
                "context": {
                    "type": "string",
                    "description": "Optional custom topic or instructions for this run"
                }
            },
            "required": ["agent_id"]
        }
    },
    {
        "name": "yomi_get_telemetry",
        "description": "Inspect real-time CPU, RAM, Battery, and host operating system telemetry.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "yomi_add_task",
        "description": "Quickly inject a new priority task vector into Yomi's active execution matrix.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Task description or title"
                },
                "priority": {
                    "type": "string",
                    "enum": ["P1", "P2", "P3"],
                    "description": "Priority tier (default: P2)"
                }
            },
            "required": ["title"]
        }
    }
]

# -------------------------------------------------------------
# JSON-RPC Standard STDIO Protocol Loop
# -------------------------------------------------------------

async def handle_request(req: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    method = req.get("method")
    req_id = req.get("id")
    params = req.get("params", {})

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "yomi-os-memory",
                    "version": "2.0.0"
                }
            }
        }

    elif method == "notifications/initialized":
        return None

    elif method == "ping":
        return {"jsonrpc": "2.0", "id": req_id, "result": {}}

    elif method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": MCP_TOOLS
            }
        }

    elif method == "tools/call":
        tool_name = params.get("name")
        args = params.get("arguments", {})
        
        try:
            if tool_name == "yomi_get_project_context":
                text = handle_get_project_context(args.get("project_name", ""))
            elif tool_name == "yomi_search_global_memory":
                text = handle_search_global_memory(args.get("query", ""))
            elif tool_name == "yomi_spawn_subagent":
                text = await handle_spawn_subagent(args.get("prompt", ""))
            elif tool_name == "yomi_execute_subagent":
                text = await handle_execute_subagent(args.get("agent_id", ""), args.get("context"))
            elif tool_name == "yomi_get_telemetry":
                text = handle_get_telemetry()
            elif tool_name == "yomi_add_task":
                text = handle_add_task(args.get("title", ""), args.get("priority", "P2"))
            else:
                text = f"Error: Unknown tool '{tool_name}'."

            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": text}],
                    "isError": False
                }
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": f"Tool execution failed: {str(e)}"}],
                    "isError": True
                }
            }

    else:
        if req_id is not None:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {
                    "code": -32601,
                    "message": f"Method '{method}' not found."
                }
            }
        return None

async def main():
    """Reads JSON-RPC messages from stdin line-by-line and outputs responses to stdout."""
    # Ensure stdout is in utf-8 mode
    if sys.platform == "win32":
        import io
        sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8")
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

    loop = asyncio.get_event_loop()
    reader = asyncio.StreamReader()
    protocol = asyncio.StreamReaderProtocol(reader)
    await loop.connect_read_pipe(lambda: protocol, sys.stdin)

    while True:
        line = await reader.readline()
        if not line:
            break
        text = line.decode("utf-8").strip()
        if not text:
            continue
        try:
            req = json.loads(text)
            resp = await handle_request(req)
            if resp is not None:
                sys.stdout.write(json.dumps(resp) + "\n")
                sys.stdout.flush()
        except Exception as e:
            err_resp = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": f"Parse error: {str(e)}"}
            }
            sys.stdout.write(json.dumps(err_resp) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    asyncio.run(main())

