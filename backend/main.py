import os
import sys

# Ensure backend directory is in sys.path for direct imports
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

import database as db
import brain
import memory
from reference_documents import router as reference_router
import meta_agent_factory as maf
from voice_engine import synthesize_speech, stream_speech_chunks, DEFAULT_VOICE
from tools.os_control import get_system_telemetry, get_top_processes
from tools.admissions_engine import (
    get_target_universities_summary,
    calculate_lab_match,
    draft_academic_email,
    sync_admissions_pipeline
)
from tools.paper_reader import document_reader
from tools.web_intelligence import live_web_search, scrape_webpage_markdown
from tools.code_sandbox import execute_python_code
from tools.workspace_manager import list_workspace_files, save_research_note, analyze_proposal_stats
from tools.academic_researcher import conduct_academic_research
from tools.web_summarizer import summarize_and_export_pdf
from tools.japanese_tutor import get_all_flashcards, get_random_card, generate_quiz_question
from tools.google_workspace import google_workspace
from mcp_connector import mcp_connector
from config import ALLOWED_ORIGINS, ENABLE_DEV_CODE_RUNNER, validate_workspace_path, validate_safe_url

app = FastAPI(title="Yomi 2.0 Backlit Executive Engine", version="2.0.0")

app.include_router(reference_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "PUT", "OPTIONS"],
    allow_headers=["*"],
)

from config import EXPORTS_DIR
from config import WORKSPACE_ROOT
AUDIO_DIR = WORKSPACE_ROOT / "cache" / "audio"
os.makedirs(EXPORTS_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

app.mount("/exports", StaticFiles(directory=EXPORTS_DIR), name="exports")
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")

# Active WebSocket connections
active_connections: List[WebSocket] = []

async def broadcast_state():
    if not active_connections:
        return
    state = get_full_state()
    message = json.dumps({"type": "STATE_UPDATE", "payload": state})
    disconnected = []
    for ws in active_connections:
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        active_connections.remove(ws)

def get_full_state():
    return {
        "domains": db.get_all_domains(),
        "projects": db.get_all_projects(),
        "tasks": db.get_all_tasks(),
        "subagents": db.get_all_subagents(),
        "logs": db.get_activity_logs(15),
        "telemetry": get_system_telemetry(),
        "admissions": get_target_universities_summary()
    }

# -------------------------------------------------------------
# Request Schemas
# -------------------------------------------------------------
class ChatPayload(BaseModel):
    message: str
    session_id: Optional[str] = "default"

class DomainPayload(BaseModel):
    name: str
    icon: Optional[str] = "folder"
    color: Optional[str] = "#ffffff"
    description: Optional[str] = ""

class ProjectPayload(BaseModel):
    domain_id: str
    title: str
    target_date: Optional[str] = None

class TaskPayload(BaseModel):
    title: str
    domain_id: Optional[str] = None
    project_id: Optional[str] = None
    priority: Optional[str] = "P2"
    due_date: Optional[str] = None

class LabMatchPayload(BaseModel):
    target_lab_id: str
    keywords: List[str]

class DraftEmailPayload(BaseModel):
    professor_name: str
    university_name: str
    research_topic: str
    purpose: Optional[str] = "inquiry"

class WebSearchPayload(BaseModel):
    query: str
    max_results: Optional[int] = 5

class WebSummarizePayload(BaseModel):
    url: str

class CodeSandboxPayload(BaseModel):
    code: str
    timeout_seconds: Optional[float] = 6.0

class PaperInspectPayload(BaseModel):
    file_path: str
    max_pages: Optional[int] = 20

class NotePayload(BaseModel):
    title: str
    content: str

class MemoryStorePayload(BaseModel):
    key: str
    value: str
    category: Optional[str] = "fact"

class SubagentSpawnPayload(BaseModel):
    prompt: str

class SubagentRunPayload(BaseModel):
    context: Optional[str] = None

# -------------------------------------------------------------
# Core Status & State
# -------------------------------------------------------------
@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "online", "system": "Yomi 2.0 Backlit Engine"}

@app.get("/api/state")
def get_state():
    return get_full_state()

@app.get("/api/telemetry")
def get_detailed_telemetry():
    telemetry = get_system_telemetry()
    procs = get_top_processes(5)
    return {"telemetry": telemetry, "top_processes": procs}

@app.post("/api/chat")
async def chat_endpoint(payload: ChatPayload):
    result = await brain.process_intent(payload.message, session_id=payload.session_id or "default")
    await broadcast_state()
    return result

@app.get("/api/chat/history")
def get_chat_history(session_id: str = "default", limit: int = 50):
    return {"messages": memory.get_session_chat_history(session_id, limit)}

@app.post("/api/tts")
async def tts_endpoint(payload: ChatPayload):
    audio_path = await synthesize_speech(payload.message)
    filename = os.path.basename(audio_path)
    return {"audio_url": f"http://127.0.0.1:8765/audio/{filename}"}

@app.get("/api/tts/stream")
@app.post("/api/tts/stream")
async def tts_stream_endpoint(text: Optional[str] = None, payload: Optional[ChatPayload] = None, voice: Optional[str] = None):
    msg = (payload.message if payload else text) or ""
    if not msg.strip():
        raise HTTPException(status_code=400, detail="Text required for TTS stream")
    v = voice or DEFAULT_VOICE
    return StreamingResponse(
        stream_speech_chunks(msg, voice=v),
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-cache",
            "Accept-Ranges": "bytes"
        }
    )

# -------------------------------------------------------------
# Tool Endpoints: Admissions & Lab Matching
# -------------------------------------------------------------
@app.get("/api/admissions/summary")
def get_admissions_summary():
    return get_target_universities_summary()

@app.post("/api/admissions/sync")
@app.get("/api/admissions/sync")
async def sync_admissions_endpoint():
    res = sync_admissions_pipeline()
    await broadcast_state()
    return res

# -------------------------------------------------------------
# Tool Endpoints: MCP Connector & CiteX Bridge
# -------------------------------------------------------------
@app.get("/api/mcp/servers")
def get_mcp_servers():
    return mcp_connector.list_all_servers()

@app.get("/api/mcp/citex/status")
async def get_citex_status():
    return await mcp_connector.get_server_status("citex")

@app.post("/api/mcp/citex/launch")
def launch_citex():
    return mcp_connector.launch_citex_background()

class CiteXResearchPayload(BaseModel):
    topic: str
    max_papers: Optional[int] = 5

@app.post("/api/mcp/citex/research")
async def citex_research_endpoint(payload: CiteXResearchPayload):
    return await mcp_connector.citex_research(payload.topic, payload.max_papers or 5)

@app.get("/api/mcp/citex/notes")
async def citex_notes_endpoint():
    return await mcp_connector.citex_get_notes()
    return get_target_universities_summary()

@app.post("/api/admissions/match")
def match_lab_endpoint(payload: LabMatchPayload):
    return calculate_lab_match(payload.keywords, payload.target_lab_id)

@app.post("/api/admissions/draft-email")
def draft_email_endpoint(payload: DraftEmailPayload):
    return draft_academic_email(
        professor_name=payload.professor_name,
        university_name=payload.university_name,
        research_topic=payload.research_topic,
        email_purpose=payload.purpose or "inquiry"
    )

# -------------------------------------------------------------
# Tool Endpoints: Academic Literature & Web Intelligence
# -------------------------------------------------------------
@app.post("/api/academic/search")
async def academic_search_endpoint(payload: WebSearchPayload):
    res = await conduct_academic_research(payload.query)
    await broadcast_state()
    return res

@app.post("/api/web/search")
async def web_search_endpoint(payload: WebSearchPayload):
    return await live_web_search(payload.query, max_results=payload.max_results or 5)

@app.post("/api/web/summarize")
async def web_summarize_endpoint(payload: WebSummarizePayload):
    if not validate_safe_url(payload.url):
        raise HTTPException(status_code=400, detail="Invalid or restricted URL target.")
    res = await summarize_and_export_pdf(payload.url)
    await broadcast_state()
    return res

# -------------------------------------------------------------
# Tool Endpoints: Sandbox & Document Reader
# -------------------------------------------------------------
@app.post("/api/sandbox/execute")
def execute_sandbox_endpoint(payload: CodeSandboxPayload):
    if not ENABLE_DEV_CODE_RUNNER:
        raise HTTPException(
            status_code=403, 
            detail="Execution disabled by default for security. Set YOMI_ENABLE_DEV_RUNNER=true in .env to enable developer execution runner."
        )
    return execute_python_code(payload.code, timeout_seconds=payload.timeout_seconds or 6.0)

@app.post("/api/paper/inspect")
def inspect_paper_endpoint(payload: PaperInspectPayload):
    try:
        safe_path = str(validate_workspace_path(payload.file_path))
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))
    return document_reader.inspect_pdf(safe_path, max_pages=payload.max_pages or 20)

# -------------------------------------------------------------
# Tool Endpoints: Workspace & Memory
# -------------------------------------------------------------
@app.get("/api/workspace/files")
def workspace_files_endpoint(folder: Optional[str] = None, ext: Optional[str] = None):
    return list_workspace_files(folder, ext)

@app.post("/api/workspace/note")
def save_note_endpoint(payload: NotePayload):
    res = save_research_note(payload.title, payload.content)
    db.add_log("Research Note Saved", f"Saved {res['filename']}", "RESEARCH", "file-text")
    return res

@app.get("/api/workspace/proposal-stats")
def proposal_stats_endpoint(path: Optional[str] = None):
    try:
        target = str(validate_workspace_path(path)) if path else str(validate_workspace_path("proposal.md"))
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    return analyze_proposal_stats(target)

@app.get("/api/memory/all")
def get_memories_endpoint():
    return memory.get_all_memories()

@app.post("/api/memory/store")
def store_memory_endpoint(payload: MemoryStorePayload):
    memory.remember(payload.key, payload.value, payload.category or "fact")
    return {"success": True, "key": payload.key}

# -------------------------------------------------------------
# Tool Endpoints: Google Workspace (Gmail & Drive)
# -------------------------------------------------------------
class GmailDraftReq(BaseModel):
    to: str
    subject: str
    body: str

class DriveStageReq(BaseModel):
    file_path: str
    subfolder: Optional[str] = "Research_Briefs"

@app.get("/api/workspace/google/status")
def google_status_endpoint():
    return google_workspace.check_auth_state()

@app.post("/api/workspace/google/draft")
async def google_draft_endpoint(payload: GmailDraftReq):
    return await google_workspace.draft_or_compose_email(payload.to, payload.subject, payload.body)

@app.post("/api/workspace/google/drive-stage")
def google_drive_stage_endpoint(payload: DriveStageReq):
    return google_workspace.stage_file_to_drive(payload.file_path, payload.subfolder or "Research_Briefs")

@app.get("/api/workspace/google/drive-files")
def google_drive_files_endpoint():
    return google_workspace.list_drive_staged_files()

# -------------------------------------------------------------
# Tool Endpoints: Japanese Language Tutor & Academic Keigo
# -------------------------------------------------------------
@app.get("/api/japanese/cards")
def get_japanese_cards(category: Optional[str] = None):
    return get_all_flashcards(category)

@app.get("/api/japanese/random")
def get_random_japanese_card(category: Optional[str] = None):
    return get_random_card(category)

@app.get("/api/japanese/quiz")
def get_japanese_quiz(category: Optional[str] = None):
    return generate_quiz_question(category)

# -------------------------------------------------------------
# Tracker Endpoints (Domains, Projects, Tasks)
# -------------------------------------------------------------
@app.post("/api/domains")
async def create_domain_endpoint(payload: DomainPayload):
    dom = db.create_domain(payload.name, payload.icon, payload.color, payload.description)
    await broadcast_state()
    return dom

@app.post("/api/projects")
async def create_project_endpoint(payload: ProjectPayload):
    proj = db.create_project(payload.domain_id, payload.title, payload.target_date)
    await broadcast_state()
    return proj

@app.post("/api/tasks")
async def create_task_endpoint(payload: TaskPayload):
    task = db.create_task(payload.title, payload.domain_id, payload.project_id, payload.priority, payload.due_date)
    await broadcast_state()
    return task

@app.post("/api/tasks/{task_id}/toggle")
async def toggle_task_endpoint(task_id: str):
    task = db.toggle_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await broadcast_state()
    return task

class TextExportPayload(BaseModel):
    content: str
    title: str = "Yomi notes"

@app.post("/api/documents/pdf")
def export_document_pdf(payload: TextExportPayload):
    from tools.text_export import export_text_pdf
    try:
        return export_text_pdf(payload.content, payload.title)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

@app.get("/api/exports/{filename}")
async def download_export(filename: str):
    file_path = os.path.join(EXPORTS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Exported PDF not found")
    return FileResponse(file_path, media_type="application/pdf", filename=filename)

# -------------------------------------------------------------
# Sub-Agent Operations (Meta-Agent Factory)
# -------------------------------------------------------------
@app.get("/api/subagents")
async def get_subagents_endpoint():
    return db.get_all_subagents()

@app.post("/api/subagents")
async def spawn_subagent_endpoint(payload: SubagentSpawnPayload):
    ag = maf.spawn_subagent_from_prompt(payload.prompt)
    await broadcast_state()
    return ag

@app.post("/api/subagents/{agent_id}/run")
async def run_subagent_endpoint(agent_id: str, payload: Optional[SubagentRunPayload] = None):
    ctx = payload.context if payload else None
    res = await maf.execute_subagent(agent_id, custom_input=ctx)
    await broadcast_state()
    return res

@app.delete("/api/subagents/{agent_id}")
async def delete_subagent_endpoint(agent_id: str):
    success = db.delete_subagent(agent_id)
    if not success:
        raise HTTPException(status_code=404, detail="Subagent not found")
    await broadcast_state()
    return {"success": True}

# -------------------------------------------------------------
# Real-Time WebSocket Telemetry & Intelligence Stream
# -------------------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    origin = websocket.headers.get("origin")
    if origin and origin not in ALLOWED_ORIGINS:
        await websocket.close(code=1008)
        return
    await websocket.accept()
    active_connections.append(websocket)
    await websocket.send_text(json.dumps({"type": "INITIAL_STATE", "payload": get_full_state()}))
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                continue
            if msg.get("type") == "CHAT_MESSAGE":
                reply_data = await brain.process_intent(msg.get("text", ""), session_id=msg.get("session_id", "default"))
                await websocket.send_text(json.dumps({"type": "CHAT_REPLY", "payload": reply_data}))
                await broadcast_state()
    except Exception:
        pass
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)

if __name__ == "__main__":
    import uvicorn
    from config import YOMI_HOST, YOMI_PORT
    uvicorn.run("main:app", host=YOMI_HOST, port=YOMI_PORT, reload=True)
