# 🌌 Yomi OS: Empirical Design, Multi-Agent Runtime Orchestration, and Self-Adaptive Systems
## Living Research Monograph, Architecture Blueprint & Engineering Laboratory Log

**Author:** Nirmiti R. Tamore  
**Domain:** Autonomous Multi-Agent Systems, Event-Driven Middleware, Distributed Reliability  
**Academic Target:** Foundational Base Model & Experimental Platform for Master's Degree in Japan (AY2027 Intake)  
**Primary Research Alignment:** Self-Adaptive Distributed Software (*Prof. Kenji Tei / Science Tokyo*), Dependable Distributed Systems (*Prof. Xavier Défago / Science Tokyo*), Distributed Systems & Middleware (*Prof. Hiroaki Fukuda / SIT*), Cyber-Physical Production Networks (*Prof. Shigeru Fujimura / Waseda IPS*).  
**Repository Location:** `D:\Projects\yomi-assistant`  
**Initial Baseline Version:** `v2.0.0-alpha`  
**Document Status:** Active Living Research Monograph  

---

## 📑 Abstract & Research Motivation

As autonomous artificial intelligence agents transition from single-prompt reasoning benchmarks to persistent, multi-domain operating environments, conventional monolithic architectures reveal severe structural deficiencies:
1. **The Latency-Interactivity Paradox:** Routing every user interaction through an autoregressive Large Language Model introduces 800ms–2500ms of Time-to-First-Token (TTFT) latency, rendering conversational executive HUDs sluggish for deterministic operations (e.g., system status, task queuing, telemetry inspection).
2. **Context Window Amnesia & Workspace Isolation:** Contemporary IDE coding assistants operate in strict directory-level isolation, losing architectural rationale, design trade-offs, and historical decisions across multi-repository lifecycles.
3. **Decoupled Worker Fragility:** Sub-agents spawned for specialized tasks (e.g., academic literature synthesis, code profiling, OS control) lack deterministic state reconciliation, distributed trace observability, and bounded failure recovery mechanisms.

**Yomi OS** is engineered as an empirical prototype to resolve these core challenges. It serves as both a production-grade personal executive command HUD and a rigorous, reproducible experimental testbed for Master's-level research in Japan.

---

## 🔬 Core Academic Research Hypotheses & Questions

### Research Question 1 (RQ1): Hybrid Sub-Millisecond Intent Routing
> *Can a dual-tier dispatch architecture (deterministic heuristic/regex router running in $\le 1\text{ms}$ + asynchronous background LLM synthesis) maintain executive interface responsiveness while preserving generative conversational intelligence?*

* **Hypothesis:** 85%+ of executive commands (telemetry, task mutations, roadmap progression, OS application launching) exhibit deterministic syntax and do not require autoregressive token generation. By handling these in $< 1\text{ms}$ at the edge and delegating only ambiguous semantic queries to local/remote LLM backends, user-perceived latency drops by over 95%.

### Research Question 2 (RQ2): Cross-Project Spatial Memory via Model Context Protocol (MCP)
> *How does exposing a global, vector-indexed spatial memory server via the Model Context Protocol (MCP) alter developer task completion rates and cross-repository consistency compared to isolated single-folder IDE environments?*

* **Hypothesis:** Exposing structured context graphs across decoupled projects (e.g., `SkillMesh`, `Japan Prep`, `Yomi OS`) through standard MCP endpoints (`yomi_get_project_context`, `yomi_search_global_memory`) mitigates context degradation without ballooning token budgets.

### Research Question 3 (RQ3): Self-Adaptive Plan Verification & Crash Recovery
> *Can event-driven worker sub-agents maintain eventual consistency across asynchronous multi-hop execution pipelines using light-weight broker checkpoints and bounded state reconciliation?*

* **Hypothesis:** Extending the fault-tolerance models developed in `SkillMesh v2` (Redis Streams + Celery crash recovery) to multi-agent task graphs prevents cascading sub-agent failures and guarantees task idempotency.

---

## 🏛️ System Architecture Specification

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
| (Chromium Backlit Shell) |          |   (FastAPI Async Core)   |          |  (Decoupled Sub-Agents)  |
|                          |          |                          |          |                          |
| • Obsidian Monochromatic | <======> | • Sub-1ms Intent Router  | <======> | • Academic Research Tool |
| • Hardware Notch Gauges  | (WS/IPC) | • SQLite State Matrix    | (Subproc)|   (ArXiv, Scholar, PDF)  |
| • Concentric Rings       |          | • Edge-TTS Vocal Engine  |          | • MCP Spatial Memory     |
| • Zero-Lag Local DOM     |          | • Real-Time Telemetry    |          | • SkillMesh v2 Observer  |
+--------------------------+          +--------------------------+          +--------------------------+
```

### 1. Tier 1: Minimalist Backlit Monochromatic HUD
* **Design Philosophy:** Inspired by high-end avionics cockpits and brutalist monochrome interfaces (`#07080a`, `#0e1014`, `#14171d`). Zero tacky neon; pure functional hierarchy.
* **Technology:** React 19 + TypeScript + Vite. Standalone Chromium App Mode (`chrome.exe --app=...`) delivering native window performance without Electron bloat (saving ~180MB RAM).
* **Hardware Gauges:** Custom SVG/CSS Notch dials rendering real-time CPU, RAM, and Battery state received via WebSocket push.
* **Telemetry Cadence:** Asynchronous push every 1.5 seconds; zero client-side polling.

### 2. Tier 2: Asynchronous Core Engine & Intent Router
* **Framework:** Python 3.12+ FastAPI with ASGI asynchronous event loop.
* **Intent Routing Pipeline:**
  $$\text{Input Query} \xrightarrow{\text{Tokenize \& Regex Match}} \begin{cases} \text{Tier 1 Match} \rightarrow \text{Direct Sub-1ms Execution} \\ \text{Ambiguous / Complex} \rightarrow \text{Ollama / DeepSeek Async Stream} \end{cases}$$
* **Speech Synthesis:** `edge-tts` streaming neural audio with W3C SSML breath pacing (400ms sentence-boundary pause, 200ms clause pause) streamed in-memory to browser Web Audio API.

### 3. Tier 3: Specialized Decoupled Satellites
* **Academic Literature Engine (SearchAgent + SynthesisAgent + CitationAgent):** Queries ArXiv/Semantic Scholar, extracts methodology and empirical results into structured PDF executive briefs, and formats BibTeX entries.
* **MCP Server Engine:** Standard STDIO/SSE protocol host exposing Yomi's persistent memory to Antigravity IDE and external agents.
* **SkillMesh Telemetry Fabric:** Distributed trace identifiers and latency hop monitoring for all worker sub-processes.

---

## 📊 Empirical Metrics & Design Decisions Table

| Component | Design Decision | Chosen Approach | Rejected Alternative | Research Justification |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop Shell** | Runtime Framework | Chromium App Mode (`--app`) | Electron / Tauri | Eliminates bundled runtime bloat; starts in $< 300\text{ms}$; uses OS-installed Chrome. |
| **Intent Dispatch** | Routing Logic | Two-Tier Hybrid (Regex + Local LLM) | Pure LLM Chain / LangChain | Pure LLM introduces 1.5s+ latency for simple tasks like "launch browser" or "check CPU". |
| **Telemetry Sync** | Client-Server Comm | Bidirectional WebSockets | HTTP REST Polling | Eliminates polling overhead and HTTP header negotiation; reduces network CPU consumption to $< 0.1\%$. |
| **Voice Synthesis** | Audio Delivery | Edge-TTS with In-Memory Buffers | Local pyttsx3 / PyGame SDL | Pygame has MSVC C++ wheel build issues on Python 3.14+; Edge-TTS provides human-grade neural voices. |
| **Persistence** | Data Layer | Embedded SQLite with WAL mode | Heavy PostgreSQL / MongoDB | Zero-daemon setup; portable single-file database (`yomi.db`); atomic ACID transactions. |

---

## 🛠️ Chronological Engineering Laboratory Log

### Milestone 1: Architectural Inception & HUD Foundation
* **Date:** Late October 2026
* **Status:** Complete ✅
* **Objectives:** 
  - Design the visual language and hardware telemetry display for Yomi 2.0.
  - Implement custom SVG Notch Gauges and Concentric Progress Rings.
* **Engineering Notes:**
  - Standard circular gauges lacked high-density information display. Developed a bespoke 14-notch radial dial with dynamic illumination thresholds.
  - Vite build pipeline optimized (`tsc -b && vite build`) generating clean production bundles in $1.21\text{s}$.

### Milestone 2: Sub-Millisecond Router & Web Intelligence
* **Date:** 24 October 2026 – 27 October 2026
* **Status:** Complete ✅
* **Objectives:**
  - Build `backend/brain.py` with instant regex intent parsing.
  - Integrate BeautifulSoup + ReportLab for single-command web deep-reading and PDF brief generation.
* **Empirical Validation:**
  - Web summarization tool successfully isolates core article bodies, strips ads/scripts, and compiles structured summaries saved to `exports/` with direct download capability.

### Milestone 3: Repository Isolation & Packaging Stabilization
* **Date:** 2 November 2026 – 3 November 2026
* **Status:** Complete ✅
* **Objectives:**
  - Move Yomi OS cleanly out of temporary directories into permanent workspace (`D:\Projects\yomi-assistant`).
  - Resolve Python 3.14 import path nuances (`sys.path.insert`) to ensure deterministic CLI execution from any working directory.
* **Engineering Notes:**
  - Eliminated legacy SDL/pygame dependencies that caused compilation failures.
  - Verified `backend.main` and `backend.brain` direct execution.

### Milestone 4: Academic Research Satellite (Literature & Citation Pipeline)
* **Date:** 3 November 2026
* **Status:** Complete & Integrated ✅
* **Objectives:**
  - Implement decoupled `SearchAgent` (ArXiv & Semantic Scholar API queries with fallback).
  - Implement `SynthesisAgent` for academic paper metadata extraction and structured executive brief PDF compilation (`ReportLab`).
  - Implement `CitationAgent` for automated standard BibTeX (`@article{...}`) and LaTeX citation generation.
  - Wire into sub-millisecond intent router (`backend/brain.py`) under `research <topic>` / `arxiv <id>`.
* **Empirical Validation & Benchmarks:**
  - Real-world query benchmark (`"research distributed fault tolerance"`) retrieved primary literature, extracted author/abstract metadata, formatted BibTeX, and synthesized a publication-grade PDF (`Orthogonal_Fault_Tolerance_for_Dynamically_Adaptiv_Research_Brief.pdf`) in **3.82s total pipeline latency**.
  - Generated briefs are automatically served via FastAPI (`/api/exports/{filename}`) and rendered in the Chromium HUD with one-click download.
* **Significance for Japan Admissions:**
  - Directly powers Nirmiti's literature reviews for prospective Japanese professors (Prof. Kenji Tei, Prof. Xavier Défago, Prof. Hiroaki Fukuda, Prof. Shigeru Fujimura).

### Milestone 5: Yomi OS Model Context Protocol (MCP) Host
* **Date:** 4 November 2026
* **Status:** Complete & Verified ✅
* **Objectives:**
  - Implement standard JSON-RPC 2.0 STDIO MCP server (`backend/mcp_server.py`) conforming to Model Context Protocol specification.
  - Expose tools: `yomi_get_project_context`, `yomi_search_global_memory`, `yomi_spawn_subagent`, `yomi_execute_subagent`, `yomi_get_telemetry`, and `yomi_add_task`.
  - Provide auto-generated configuration file (`mcp_config.json`) ready for Antigravity IDE, Claude Code, and Cursor.
* **Empirical Validation:**
  - Tested JSON-RPC tool calls for telemetry inspection and cross-project memory search over persistent SQLite store (`yomi.db`). Returns formatted context in $< 15\text{ms}$.

### Milestone 6: Core Meta-Agent Factory Engine
* **Date:** 4 November 2026
* **Status:** Complete & Integrated ✅
* **Objectives:**
  - Dynamic agent schema synthesis (`backend/meta_agent_factory.py`) turning high-level prompts into structured worker schemas (`name`, `role`, `tools_bound`, `schedule`).
  - Isolated worker execution runtime binding academic research, web summarization, and host telemetry.
  - Sub-agent lifecycle tracking in SQLite database (`subagents` table) with audit trail logging.
  - Fast-router integration in `backend/brain.py` supporting natural syntax: `"spawn agent to monitor <task>"` and `"run agent <name>"`.

### Milestone 7: Backlit HUD Satellite Panel & End-to-End System Delivery
* **Date:** 4 November 2026
* **Status:** Complete & Production Bundled ✅
* **Objectives:**
  - Integrate dedicated **Autonomous Sub-Agents & Satellites** panel into the React 19 / TypeScript Chromium HUD (`frontend/src/App.tsx`).
  - Live status pills (`IDLE`, `RUNNING`, `FAILED`), bound tool chips, and real-time execution outputs.
  - 1-click execution (`Play`), decommissioning (`Trash`), and dynamic agent prompt deployment capsule.
  - Production bundle verified (`dist/` compiled cleanly in $1.43\text{s}$).

---

## 🎓 Master's Thesis Proposal Alignment (Japan AY2027)

When presenting Yomi OS to prospective Japanese university admission committees and professors, this platform will be positioned as:

1. **Experimental Testbed:** A fully functional, production-instrumented testbed for **"Self-Adaptive Multi-Agent Coordination and Runtime Fault Tolerance in Decentralized Computing"**.
2. **Empirical Evidence:** Proves the applicant does not merely conceptualize distributed systems, but designs, deploys, benchmarks, and optimizes them from hardware telemetry up to autonomous agentic lifecycles.
3. **Publication Pipeline:** Provides the empirical data, latency measurements, and state synchronization logs required to author academic preprints and conference papers (e.g., IEEE/ACM ASE, SAS, or DAIS).

---
*Maintained continuously as Yomi OS evolves.*
