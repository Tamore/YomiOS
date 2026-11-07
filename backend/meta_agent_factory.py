import os
import sys
import json
import asyncio
import re
from datetime import datetime
from typing import Dict, Any, List, Optional

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import database as db
from tools.academic_researcher import conduct_academic_research
from tools.web_summarizer import summarize_and_export_pdf
from tools.os_control import get_system_telemetry, launch_app

# -------------------------------------------------------------
# 1. Dynamic Agent Schema Synthesizer
# -------------------------------------------------------------

def generate_agent_schema(user_prompt: str) -> Dict[str, Any]:
    """Generates a structured sub-agent schema based on high-level instruction."""
    text = user_prompt.strip()
    lower = text.lower()
    
    # Determine tools to bind based on intent
    tools_bound = []
    if any(k in lower for k in ["paper", "arxiv", "scholar", "research", "citation", "academic", "literature"]):
        tools_bound.append("academic_researcher")
    if any(k in lower for k in ["url", "web", "scrape", "summarize", "website", "html"]):
        tools_bound.append("web_summarizer")
    if any(k in lower for k in ["cpu", "ram", "battery", "telemetry", "hardware", "process", "launch", "system"]):
        tools_bound.append("os_control")
        
    if not tools_bound:
        tools_bound.append("os_control") # Default minimal tool

    # Extract name and role
    role = "Specialized Task Worker"
    name = "Custom Autonomous Worker"
    
    clean_target = re.sub(r'^(?:create|spawn|build|instantiate|deploy|start)\s+(?:a\s+)?(?:new\s+)?(?:sub-?agent|agent|worker)\s+(?:to|for|called|named)?\s*', '', text, flags=re.IGNORECASE).strip()
    if clean_target:
        name = clean_target[:35].title() + " Agent"
        if "research" in lower or "paper" in lower:
            role = "Academic Literature Specialist"
        elif "monitor" in lower or "auditor" in lower or "telemetry" in lower:
            role = "Observability Sentinel"
        elif "web" in lower or "scrape" in lower:
            role = "Web Intelligence Analyst"

    schedule = "manual"
    if "every hour" in lower or "hourly" in lower:
        schedule = "interval:1h"
    elif "every 30m" in lower or "every 30 min" in lower:
        schedule = "interval:30m"
    elif "daily" in lower:
        schedule = "interval:24h"

    return {
        "name": name,
        "role": role,
        "prompt_template": text,
        "tools_bound": tools_bound,
        "schedule": schedule
    }

# -------------------------------------------------------------
# 2. Worker Execution Runtime
# -------------------------------------------------------------

async def execute_subagent(agent_id: str, custom_input: Optional[str] = None) -> Dict[str, Any]:
    """Executes a sub-agent's assigned workflow in an isolated runtime context."""
    agent = db.get_subagent(agent_id)
    if not agent:
        return {"success": False, "error": f"Subagent {agent_id} not found."}

    db.update_subagent_status(agent_id, "RUNNING")
    
    start_time = datetime.now()
    tools = agent.get("tools_bound", [])
    output_parts = []
    has_failure = False
    
    try:
        # 1. Execute Academic Research tool if bound
        if "academic_researcher" in tools:
            query = custom_input or agent["prompt_template"]
            clean_query = re.sub(r'(?:monitor|search|research|papers on|find)\s*', '', query, flags=re.IGNORECASE).strip()
            if not clean_query:
                clean_query = "self-adaptive distributed systems"
            res = await conduct_academic_research(clean_query)
            if res.get("success"):
                top_p = res.get("paper", {})
                output_parts.append(f"Retrieved: '{top_p.get('title')}' ({top_p.get('year')}). PDF Brief: {res.get('pdf_filename')}")
            else:
                has_failure = True
                output_parts.append(f"Research failed: {res.get('message') or res.get('error') or 'No papers found'}")

        # 2. Execute Web Summarizer tool if bound
        if "web_summarizer" in tools:
            url_match = re.search(r'(https?://[^\s]+|[a-zA-Z0-9_\-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?)', agent["prompt_template"])
            if url_match:
                target_url = url_match.group(1)
                res = await summarize_and_export_pdf(target_url)
                if res.get("success"):
                    output_parts.append(f"Summarized {target_url} into {res.get('filename')}")
                else:
                    has_failure = True
                    output_parts.append(f"Summarizer failed: {res.get('error', 'Unknown extraction error')}")
            else:
                has_failure = True
                output_parts.append("Web summarizer bound, but no target URL specified.")

        # 3. Execute OS Control if bound
        if "os_control" in tools:
            telemetry = get_system_telemetry()
            output_parts.append(f"Telemetry Audit: CPU {telemetry['cpu_percent']}%, RAM {telemetry['ram_percent']}%, Battery {telemetry['battery_percent']}%.")

        execution_summary = " | ".join(output_parts) if output_parts else "Execution completed without output."
        elapsed_sec = (datetime.now() - start_time).total_seconds()
        final_output = f"[{datetime.now().strftime('%H:%M:%S')}] {execution_summary} (Latency: {elapsed_sec:.2f}s)"
        
        final_status = "FAILED" if has_failure else "IDLE"
        db.update_subagent_status(agent_id, final_status, final_output)
        db.add_log(f"Sub-Agent '{agent['name']}' {'Failed' if has_failure else 'Executed'}", final_output, "AGENT", "alert-triangle" if has_failure else "play")
        
        return {
            "success": not has_failure,
            "agent_id": agent_id,
            "agent_name": agent["name"],
            "status": final_status,
            "output": final_output,
            "latency_seconds": elapsed_sec
        }

    except Exception as e:
        error_msg = f"Execution failed: {str(e)}"
        db.update_subagent_status(agent_id, "FAILED", error_msg)
        db.add_log(f"Sub-Agent '{agent['name']}' Error", error_msg, "AGENT", "alert-triangle")
        return {
            "success": False,
            "agent_id": agent_id,
            "status": "FAILED",
            "error": error_msg
        }

# -------------------------------------------------------------
# 3. Dynamic Spawn & Register
# -------------------------------------------------------------

def spawn_subagent_from_prompt(prompt: str) -> Dict[str, Any]:
    """Generates schema and registers worker into SQLite database."""
    schema = generate_agent_schema(prompt)
    created = db.create_subagent(
        name=schema["name"],
        role=schema["role"],
        prompt_template=schema["prompt_template"],
        tools_bound=schema["tools_bound"],
        schedule=schema["schedule"]
    )
    return created

