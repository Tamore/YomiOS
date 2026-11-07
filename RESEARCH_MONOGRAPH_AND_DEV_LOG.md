# Yomi OS: Technical Architecture, Multi-Agent Runtime & Development Log

## System Architecture, Design Decisions & Verified Engineering Baseline

**System:** Yomi OS (Executive Intelligence & Distributed Agent Runtime)  
**Architecture:** Python FastAPI Async Core + React 19 Bklit UI + Model Context Protocol (MCP) Server  
**Current Branch:** `fix/audit-repairs`  
**Repository Location:** `D:\Projects\Yomi`  

---

## 1. Abstract & System Overview

Yomi OS is a local-first personal executive assistant and autonomous agent testbed. The system addresses common challenges in local AI runtime orchestration:

1. **Deterministic Latency Separation:** Separates deterministic operations (hardware telemetry, task updates, ArXiv searches, local document indexing) from generative LLM inference.
2. **Local-First State Retention:** Uses embedded SQLite for task tracking, activity logging, and bounded multi-turn conversation history.
3. **Model Context Protocol (MCP) Server:** Exposes a standard JSON-RPC 2.0 STDIO MCP server interface (`backend/mcp_server.py`) allowing external IDEs and agents to query project roadmaps, persistent memory, and host telemetry.
4. **Security & Boundary Containment:** Strict workspace path containment, comprehensive SSRF protection on HTTP fetching and redirects, and default-disabled arbitrary Python execution.

---

## 2. System Architecture

```text
+-------------------------------------------------------------------------------------------------------+
|                                      YOMI OS PLATFORM ARCHITECTURE                                    |
+-------------------------------------------------------------------------------------------------------+
                                                   |
      +--------------------------------------------+--------------------------------------------+
      |                                            |                                            |
      v                                            v                                            v
+--------------------------+          +--------------------------+          +--------------------------+
|   TIER 1: FRONTEND HUD   |          |    TIER 2: CORE BRAIN    |          |    TIER 3: SATELLITES    |
| (Chromium / Vite React)  |          |   (FastAPI Async Core)   |          |  (Decoupled Sub-Agents)  |
|                          |          |                          |          |                          |
| • Bklit Obsidian Theme   | <======> | • Intent Dispatcher      | <======> | • ArXiv Research Sat     |
| • Hardware Telemetry     | (HTTP/WS)| • SQLite Storage Pool    | (Subproc)|   (ArXiv API, PDF Brief) |
| • Task & Pipeline Drawer |          | • Memory & Context Store |          | • MCP Stdio Server Host  |
| • Japanese Flashcard Dojo|          | • Security Containment   |          | • CiteX REST Bridge      |
+--------------------------+          +--------------------------+          +--------------------------+
```

---

## 3. Design Decisions & Verified Baseline

| Component | Design Decision | Chosen Approach | Rejected Alternative | Engineering Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Shell** | Runtime Framework | React 19 + Vite + Tailwind v4 | Electron / Tauri | Eliminates bundled framework overhead; fast HMR; runs in browser or Chrome app mode. |
| **Intent Dispatch** | Routing Logic | Two-Tier Hybrid (Pattern router + Local LLM) | Pure LLM Chain | Pattern router immediately handles search, tasks, and telemetry without LLM token latency. |
| **Persistence** | Data Layer | SQLite with Foreign Keys | Heavy PostgreSQL daemon | Zero-daemon setup; single-file storage (`yomi.db`); atomic ACID transactions. |
| **Execution Security** | Code Runner | Disabled by default; explicit opt-in required | Unrestricted auto-exec | Prevents unauthenticated remote code execution via web or chat interfaces. |
| **Network Boundaries** | SSRF Defense | Strict DNS resolution + redirect hop checking | Blind `follow_redirects` | Blocks private, loopback, CGNAT, and link-local address targets. |

---

## 4. Chronological Engineering & Audit Milestones

### Milestone 1: Core Engine & Fast-Dispatch
* **Status:** Complete & Verified
* FastAPI backend with REST endpoints on `127.0.0.1:8765`.
* Intent routing in `backend/brain.py` supporting natural commands (`paper on ...`, `add task: ...`, `telemetry`, `search web ...`).
* Bounded multi-turn conversational memory with SQLite session storage (`conversation_history`).

### Milestone 2: Academic Research Satellite (Literature & BibTeX Pipeline)
* **Status:** Complete & Verified
* Decoupled `search_arxiv` and `search_semantic_scholar` query pipeline.
* Monochromatic executive research brief PDF generator using ReportLab with Unicode and Japanese font support (`HeiseiKakuGo-W5`, `HeiseiMin-W3`).
* Automatic BibTeX citation generator with clean cite-keys.
* Clear distinction between abstract/metadata briefs and full-text paper synthesis.

### Milestone 3: Model Context Protocol (MCP) Host
* **Status:** Complete & Verified
* Standard JSON-RPC 2.0 STDIO MCP server (`backend/mcp_server.py`).
* Exposes tools: `yomi_get_project_context`, `yomi_search_global_memory`, `yomi_spawn_subagent`, `yomi_execute_subagent`, `yomi_get_telemetry`, `yomi_add_task`.
* Proper error reporting with `isError: True` on unknown tools and failures.

### Milestone 4: Security Hardening & Containment
* **Status:** Complete & Verified
* Centralized security policy in `backend/config.py`.
* `validate_workspace_path` prevents directory traversal across document reader, workspace manager, and Drive staging.
* `validate_safe_url` and `safe_http_get` block SSRF attacks on initial queries and on every redirect hop.
* Arbitrary Python execution runner strictly disabled by default (returns HTTP 403).
* CORS restricted to loopback origins by default.

### Milestone 5: Executive Frontend UI & Design System
* **Status:** Complete & Verified
* Authentic Bklit UI implementation with `--chart-1` through `--chart-5` OKLCH tokens, hairline frames (`.bklit-frame`), and squircle grids.
* Minimized, non-intrusive bottom-docked controller for SQLite task management.
* Honest data states: metrics display "Not measured" or "Not verified" when unrecorded; research satellite displays distinct loading, empty, and failure states.
* Real-time task synchronization: chat task additions immediately refresh the active task list.

---

## 5. Verified Limitations & Operating Prerequisites

1. **Local LLM Dependencies:** Local inference requires Ollama running at `http://127.0.0.1:11434` with `qwen2.5:7b` (or preferred model). If Ollama is offline and cloud API keys are not supplied, conversational chat gracefully falls back to deterministic executive routing.
2. **CiteX Integration:** CiteX literature radar runs as an independent service on port 8000; when inactive, the connection badge honestly reports `Offline (:8000)`.
3. **Google Workspace:** In default out-of-the-box mode, Gmail operates via direct 1-click web compose links, and Drive operations stage files locally to `Google_Drive_Sync/`. Native API mode activates only when OAuth `credentials.json` is configured.
4. **Developer Code Runner:** Arbitrary code execution is gated behind `YOMI_ENABLE_DEV_RUNNER=true` in `.env`. Leave disabled in untrusted environments.
