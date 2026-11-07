import os
import json
import httpx
import subprocess
from typing import Dict, Any, List, Optional

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mcp_servers.json")
CITEX_DIR = r"D:\Projects\CiteX"
CITEX_DEFAULT_URL = "http://127.0.0.1:8000"

class MCPConnector:
    """
    Model Context Protocol (MCP) Bridge and Multi-App Connector.
    Connects Yomi to CiteX and external microservices/tools.
    """
    def __init__(self):
        self.servers = {}
        self.load_configuration()

    def load_configuration(self):
        if os.path.exists(CONFIG_PATH):
            try:
                with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.servers = data.get("mcpServers", {})
            except Exception:
                self.servers = {}
        else:
            self.servers = {
                "citex": {
                    "name": "CiteX Autonomous Research Engine",
                    "type": "http",
                    "url": CITEX_DEFAULT_URL,
                    "description": "Multi-source academic literature review, faculty radar, and IEEE paper compiler."
                }
            }

    async def get_server_status(self, server_id: str = "citex") -> Dict[str, Any]:
        """Checks connectivity to a registered MCP tool server."""
        srv = self.servers.get(server_id)
        if not srv:
            return {"online": False, "error": f"Unknown server {server_id}"}

        url = srv.get("url", CITEX_DEFAULT_URL)
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{url}/api/v1/health")
                if res.status_code == 200:
                    return {
                        "online": True,
                        "server_id": server_id,
                        "name": srv.get("name"),
                        "url": url,
                        "data": res.json()
                    }
                else:
                    return {
                        "online": False,
                        "server_id": server_id,
                        "name": srv.get("name"),
                        "url": url,
                        "error": f"HTTP {res.status_code}"
                    }
        except Exception as e:
            return {
                "online": False,
                "server_id": server_id,
                "name": srv.get("name"),
                "url": url,
                "error": str(e)
            }

    def launch_citex_background(self) -> Dict[str, Any]:
        """Launches CiteX backend server locally if not active."""
        if not os.path.exists(CITEX_DIR):
            return {"success": False, "error": f"CiteX directory not found at {CITEX_DIR}"}

        try:
            bat_path = os.path.join(CITEX_DIR, "launch_citex_app.bat")
            if os.path.exists(bat_path):
                subprocess.Popen([bat_path], cwd=CITEX_DIR, shell=True)
            else:
                subprocess.Popen(["python", "-m", "uvicorn", "app.main:app", "--port", "8000"], cwd=CITEX_DIR, shell=True)
            return {"success": True, "message": "CiteX background server launch dispatched."}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def citex_research(self, topic: str, max_papers: int = 5) -> Dict[str, Any]:
        """Dispatches an autonomous multi-source literature review to CiteX."""
        url = self.servers.get("citex", {}).get("url", CITEX_DEFAULT_URL)
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                payload = {
                    "topic": topic,
                    "max_papers": max_papers,
                    "target_venue": "IEEE",
                    "compile_pdf": True
                }
                res = await client.post(f"{url}/api/v1/research", json=payload)
                if res.status_code == 200:
                    return {"success": True, "data": res.json()}
                else:
                    return {"success": False, "error": f"CiteX error {res.status_code}: {res.text}"}
        except Exception as e:
            return {"success": False, "error": f"Could not reach CiteX on {url}: {str(e)}"}

    async def citex_synthesize_note(self, title: str, content: str, source_url: str = "", folder: str = "Yomi Synced") -> Dict[str, Any]:
        """Sends an active article or document to CiteX to be structured and compiled into an IEEE PDF."""
        url = self.servers.get("citex", {}).get("url", CITEX_DEFAULT_URL)
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                payload = {
                    "title": title,
                    "content": content,
                    "source_url": source_url,
                    "folder": folder
                }
                res = await client.post(f"{url}/api/v1/notes", json=payload)
                if res.status_code == 200:
                    return {"success": True, "data": res.json()}
                else:
                    return {"success": False, "error": f"CiteX error {res.status_code}: {res.text}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def citex_get_notes(self) -> Dict[str, Any]:
        """Fetches all research notes cataloged by CiteX."""
        url = self.servers.get("citex", {}).get("url", CITEX_DEFAULT_URL)
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{url}/api/v1/notes")
                if res.status_code == 200:
                    return {"success": True, "notes": res.json()}
                return {"success": False, "error": f"HTTP {res.status_code}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def citex_get_history(self) -> Dict[str, Any]:
        """Fetches past compiled papers from CiteX."""
        url = self.servers.get("citex", {}).get("url", CITEX_DEFAULT_URL)
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{url}/api/v1/history")
                if res.status_code == 200:
                    return {"success": True, "history": res.json()}
                return {"success": False, "error": f"HTTP {res.status_code}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def list_all_servers(self) -> List[Dict[str, Any]]:
        out = []
        for k, v in self.servers.items():
            out.append({
                "id": k,
                "name": v.get("name", k),
                "type": v.get("type", "http"),
                "url": v.get("url", ""),
                "description": v.get("description", "")
            })
        return out

mcp_connector = MCPConnector()

