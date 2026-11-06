import os
import sys

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import re
import json
import random
from typing import Dict, Any, Tuple, Optional

import database as db
import memory
from llm_client import llm_client
from tools.web_summarizer import summarize_and_export_pdf
from tools.academic_researcher import conduct_academic_research
from tools.os_control import launch_app, get_system_telemetry, get_top_processes
from tools.admissions_engine import (
    get_target_universities_summary,
    calculate_lab_match,
    draft_academic_email
)
from tools.paper_reader import document_reader
from tools.web_intelligence import live_web_search, scrape_webpage_markdown
from tools.code_sandbox import execute_python_code
from tools.workspace_manager import list_workspace_files, save_research_note, analyze_proposal_stats
from tools.japanese_tutor import get_random_card, generate_quiz_question, get_all_flashcards
from tools.google_workspace import google_workspace
from mcp_connector import mcp_connector

SYSTEM_PROMPT = """You are Yomi, an elite, witty, and exceptionally sharp executive AI companion and research chief of staff.
You assist Nirmiti with her Japan Master's applications, distributed systems research, engineering projects, and daily life.
Tone: Natural, concise, brilliant, slightly playful/witty, zero robotic clichés (never say "How may I assist you today?").
Keep conversational answers punchy (1-3 sentences maximum). Output clear facts, sharp insights, and proactive steps."""

async def process_intent(user_input: str, session_id: str = "default") -> Dict[str, Any]:
    text = user_input.strip()
    lower = text.lower()
    
    # -------------------------------------------------------------
    # 1. MEMORY ENGINE: Explicit Remember / Recall
    # e.g., "remember that I prefer LaTeX for all math", "what do you remember about me?"
    # -------------------------------------------------------------
    remember_match = re.search(r'(?:remember that|store fact|note that)\s+(.+)', lower)
    if remember_match:
        fact = remember_match.group(1).strip()
        key_slug = re.sub(r'[^a-zA-Z0-9_]', '_', fact[:30]).lower()
        memory.remember(key=f"user_{key_slug}", value=fact, category="user_preference")
        db.add_log("Memory Stored", f"Indexed: '{fact}'", "SYSTEM", "database")
        return {
            "reply": f"Logged to permanent neural memory: *'{fact}'*. I won't forget it.",
            "tool_used": "memory_store",
            "data": {"key": key_slug, "fact": fact}
        }

    if any(q in lower for q in ["what do you remember", "what do you know about me", "my profile", "list memories"]):
        mems = memory.get_all_memories()
        preview = "\n".join([f"• **{m['key']}**: {m['value']}" for m in mems[:6]])
        return {
            "reply": f"Here is what I have indexed in your profile matrix:\n\n{preview}",
            "tool_used": "memory_recall",
            "data": mems
        }

    # -------------------------------------------------------------
    # 2. JAPANESE LANGUAGE TUTOR & ACADEMIC KEIGO
    # e.g., "japanese quiz", "japanese card", "lab japanese", "practice japanese"
    # -------------------------------------------------------------
    if any(q in lower for q in ["japanese quiz", "nihongo quiz", "test my japanese"]):
        quiz = generate_quiz_question()
        opts_text = "\n".join([f"  {idx+1}. {opt}" for idx, opt in enumerate(quiz['options'])])
        reply = (
            f"**Japanese Drill ({quiz['category'].upper()})**\n\n"
            f"**{quiz['prompt_kanji']}** ({quiz['prompt_romaji']})\n"
            f"*{quiz['prompt_hiragana']}*\n\n"
            f"What does this mean?\n{opts_text}\n\n"
            f"*(Correct: {quiz['correct_answer']})*"
        )
        return {
            "reply": reply,
            "tool_used": "japanese_quiz",
            "data": quiz
        }

    if any(q in lower for q in ["japanese card", "japanese flashcard", "learn japanese", "lab japanese", "japanese phrase"]):
        cat = "lab_keigo" if "lab" in lower or "professor" in lower else None
        card = get_random_card(cat)
        reply = (
            f"**{card['kanji']}**\n"
            f"• Hiragana: *{card['hiragana']}*\n"
            f"• Romaji: `{card['romaji']}`\n"
            f"• Meaning: **{card['meaning']}**\n\n"
            f"💡 *Usage Tip:* {card['usage_tip']}"
        )
        return {
            "reply": reply,
            "tool_used": "japanese_flashcard",
            "data": card
        }

    # -------------------------------------------------------------
    # 3. GOOGLE WORKSPACE CONNECTOR (GMAIL & GOOGLE DRIVE)
    # e.g., "draft gmail to fukuda", "open in gmail", "save to drive", "google workspace status"
    # -------------------------------------------------------------
    if any(q in lower for q in ["google workspace status", "gmail status", "drive status", "check google"]):
        state = google_workspace.check_auth_state()
        return {
            "reply": f"Google Workspace Bridge: **{state['status']}**.\n• Ready to open 1-click pre-filled Gmail drafts and mirror documents to Google Drive Sync folder.",
            "tool_used": "google_workspace_status",
            "data": state
        }

    gmail_match = re.search(r'(?:open in gmail|draft gmail|send via gmail)\s*(?:to\s+)?([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)?', lower)
    if gmail_match and not any(w in lower for w in ["academic email"]):
        to_email = gmail_match.group(1) or "hiroaki@shibaura-it.ac.jp"
        subj = "Inquiry regarding Master's Research (AY2027) — Nirmiti Ramesh Tamore"
        body = "Dear Professor,\n\nI hope this email finds you well.\n\nBest regards,\nNirmiti Ramesh Tamore"
        res = await google_workspace.draft_or_compose_email(to=to_email, subject=subj, body=body)
        db.add_log("Google Workspace", f"Generated Gmail Compose link for {to_email}", "EMAIL", "mail")
        return {
            "reply": f"Gmail Compose Link prepared for **{to_email}**! Click below to open in your browser or native app:\n\n[Open Compose in Gmail]({res['web_url']})",
            "tool_used": "gmail_compose",
            "data": res
        }

    if "save to drive" in lower or "sync to drive" in lower or "upload to drive" in lower:
        # Save latest brief or proposal
        source_doc = r"d:\Japan Prep Temp\Nirmiti_Masters\Final_Formal_Research_Proposal.md"
        stage_res = google_workspace.stage_file_to_drive(source_doc, "Master_Proposals")
        db.add_log("Google Workspace", "Staged proposal to Google Drive Sync", "DRIVE", "hard-drive")
        return {
            "reply": f"Staged **{stage_res['filename']}** to your Google Drive Sync folder (`Google_Drive_Sync/Master_Proposals`).",
            "tool_used": "google_drive_sync",
            "data": stage_res
        }

    # -------------------------------------------------------------
    # 4. MCP CONNECTOR & CITEX AGENT BRIDGE
    # e.g., "citex status", "launch citex", "ask citex to research self-adaptive systems", "citex notes"
    # -------------------------------------------------------------
    if any(q in lower for q in ["citex status", "mcp status", "check citex", "is citex running"]):
        status = await mcp_connector.get_server_status("citex")
        if status["online"]:
            return {
                "reply": f"CiteX MCP Bridge is **ONLINE** at `{status['url']}`! Ready to compile papers and review literature.",
                "tool_used": "mcp_citex_status",
                "data": status
            }
        else:
            return {
                "reply": f"CiteX server is currently offline at `{status['url']}`. You can say *'launch citex'* to spin it up automatically.",
                "tool_used": "mcp_citex_status",
                "data": status
            }

    if "launch citex" in lower or "start citex" in lower:
        res = mcp_connector.launch_citex_background()
        db.add_log("MCP Connector", "Dispatched CiteX background launcher", "MCP", "cpu")
        return {
            "reply": "CiteX desktop research engine launched in the background! Bridged via MCP.",
            "tool_used": "mcp_launch_citex",
            "data": res
        }

    citex_research_match = re.search(r'(?:ask citex to research|citex research|run citex on)\s+(.+)', lower)
    if citex_research_match:
        topic = citex_research_match.group(1).strip()
        db.add_log("MCP Dispatch", f"Triggered CiteX research for '{topic}'", "MCP", "book-open")
        res = await mcp_connector.citex_research(topic)
        if res["success"]:
            rep = res["data"]
            return {
                "reply": f"CiteX completed multi-source literature review for **'{topic}'**! Examined {len(rep.get('papers', []))} papers and generated IEEE synthesis.",
                "tool_used": "mcp_citex_research",
                "data": rep
            }
        else:
            return {
                "reply": f"CiteX bridge error: {res.get('error')}. (Make sure CiteX is running on port 8000 via 'launch citex').",
                "tool_used": "mcp_citex_research",
                "error": res.get("error")
            }

    if "citex notes" in lower or "citex library" in lower or "citex history" in lower:
        notes_res = await mcp_connector.citex_get_notes()
        if notes_res["success"]:
            notes = notes_res.get("notes", [])
            return {
                "reply": f"CiteX has **{len(notes)}** research notes cataloged. Ready to reference in Yomi.",
                "tool_used": "mcp_citex_notes",
                "data": notes_res
            }
        else:
            return {
                "reply": f"Could not retrieve CiteX library: {notes_res.get('error')}",
                "tool_used": "mcp_citex_notes"
            }

    # -------------------------------------------------------------
    # 3. ADMISSIONS & LAB PROFILER
    # e.g., "admissions status", "check deadlines", "match lab sit", "draft email to fukuda"
    # -------------------------------------------------------------
    if any(q in lower for q in ["admissions status", "check deadlines", "japan deadlines", "university deadlines"]):
        summary = get_target_universities_summary()
        reply_lines = ["**AY2027 Japan Admissions Horizon:**"]
        for u in summary:
            first_dl = u["deadlines"][0] if u["deadlines"] else None
            dl_text = f"{first_dl['event']} on {first_dl['date']} ({first_dl['days_left']}d left)" if first_dl else "No immediate date"
            reply_lines.append(f"• **{u['name']}**: {dl_text}")
        return {
            "reply": "\n".join(reply_lines),
            "tool_used": "admissions_deadlines",
            "data": summary
        }

    email_match = re.search(r'(?:draft|write)\s+(?:an?\s+)?(?:academic\s+)?email\s+(?:to\s+)?(?:prof(?:essor)?\.?\s+)?([a-zA-Z\s]+)', lower)
    if email_match:
        prof_target = email_match.group(1).strip().title()
        uni_name = "Target University"
        topic = "Distributed Systems and Self-Adaptive Autonomous Architectures"
        if "fukuda" in prof_target.lower():
            prof_target = "Hiroaki Fukuda"
            uni_name = "Shibaura Institute of Technology"
        elif "fujimura" in prof_target.lower():
            prof_target = "Shigeru Fujimura"
            uni_name = "Waseda University (IPS)"
        elif "tei" in prof_target.lower():
            prof_target = "Kenji Tei"
            uni_name = "Institute of Science Tokyo"
        elif "inoue" in prof_target.lower():
            prof_target = "Michiko Inoue"
            uni_name = "NAIST"

        email_data = draft_academic_email(
            professor_name=prof_target,
            university_name=uni_name,
            research_topic=topic,
            email_purpose="inquiry"
        )
        return {
            "reply": f"Drafted high-register academic reachout email for **Prof. {prof_target}** at {uni_name}.\n\n**Subject:** {email_data['subject']}",
            "tool_used": "admissions_email_drafter",
            "data": email_data
        }

    match_lab_match = re.search(r'(?:match|evaluate fit|lab fit)\s+(?:for\s+)?(?:lab\s+)?([a-zA-Z0-9_\-]+)', lower)
    if match_lab_match:
        target_name = match_lab_match.group(1).strip().lower()
        lab_id = "sit"
        if any(w in target_name for w in ["sit", "shibaura", "fukuda"]):
            lab_id = "sit"
        elif any(w in target_name for w in ["waseda", "ips", "fujimura"]):
            lab_id = "waseda_ips"
        elif any(w in target_name for w in ["naist", "inoue"]):
            lab_id = "naist"
        elif any(w in target_name for w in ["science_tokyo", "tokyo_tech", "tei", "defago"]):
            lab_id = "science_tokyo"
        elif any(w in target_name for w in ["ritsumeikan", "frex", "nakasuka"]):
            lab_id = "ritsumeikan"
        
        keywords = ["Distributed Systems", "Self-Adaptive", "Decentralized Consensus", "Autonomous Agents", "Fault Tolerance"]
        fit_data = calculate_lab_match(keywords, lab_id)
        if "error" not in fit_data and fit_data.get("advisors_match"):
            advisor = fit_data["advisors_match"][0]
            return {
                "reply": f"Lab match for **{fit_data['university']}** ({advisor['professor']}): **{advisor['match_score']}% fit** based on shared research vectors in {', '.join(advisor['overlap_topics'][:3])}.",
                "tool_used": "lab_matcher",
                "data": fit_data
            }
        else:
            return {
                "reply": f"Could not find an exact lab profile for '{target_name}'. Available labs: SIT (Fukuda), Waseda IPS (Fujimura), NAIST (Inoue), Science Tokyo (Tei / Défago), Ritsumeikan (Nakasuka).",
                "tool_used": "lab_matcher"
            }

    # -------------------------------------------------------------
    # 3. LIVE WEB SEARCH (DuckDuckGo Zero-Key Engine)
    # e.g., "search web for ICSE 2027 deadlines", "google self-adaptive systems 2026"
    # -------------------------------------------------------------
    web_search_match = re.search(r'(?:search web for|search online for|search for|google|ddg)\s+(.+)', lower)
    if web_search_match and not any(w in lower for w in ["paper", "arxiv", "file"]):
        q = web_search_match.group(1).strip()
        search_res = await live_web_search(q, max_results=4)
        if search_res["success"] and search_res["results"]:
            top = search_res["results"][0]
            reply = f"Web search for *'{q}'* returned {search_res['count']} findings. Top hit: **{top['title']}** ({top['url']})."
            db.add_log("Live Web Search", f"Queried: '{q}'", "INTELLIGENCE", "globe")
            return {
                "reply": reply,
                "tool_used": "live_web_search",
                "data": search_res
            }

    # -------------------------------------------------------------
    # 4. CODE SANDBOX & FORMULA RUNNER
    # e.g., "run python: print(sum([1,2,3]))", "calculate 15 * 84"
    # -------------------------------------------------------------
    code_match = re.search(r'(?:run python|exec python|py run|run script|sandbox):\s*(.+)', text, re.DOTALL)
    if code_match:
        script = code_match.group(1).strip()
        res = execute_python_code(script)
        out = res["stdout"].strip() if res["stdout"] else res["stderr"].strip()
        db.add_log("Code Sandbox", f"Executed Python snippet ({res['execution_time_ms']}ms)", "CODE", "terminal")
        return {
            "reply": f"Sandbox executed in {res['execution_time_ms']}ms:\n```\n{out}\n```",
            "tool_used": "code_sandbox",
            "data": res
        }

    # -------------------------------------------------------------
    # 5. LOCAL PDF & PAPER INGESTION
    # e.g., "read pdf D:/path/to/paper.pdf", "search in pdf D:/guide.pdf for 'IELTS'"
    # -------------------------------------------------------------
    pdf_match = re.search(r'(?:read|inspect|parse)\s+pdf\s+([^\s]+)', text)
    if pdf_match:
        pdf_path = pdf_match.group(1).strip().strip('"').strip("'")
        pdf_data = document_reader.inspect_pdf(pdf_path)
        if pdf_data["success"]:
            return {
                "reply": f"Extracted **{pdf_data['filename']}** ({pdf_data['total_pages']} pages). Abstract preview:\n\n> {pdf_data['abstract'][:400]}...",
                "tool_used": "paper_reader",
                "data": pdf_data
            }
        else:
            return {"reply": f"Could not inspect PDF: {pdf_data.get('error')}", "tool_used": "paper_reader", "error": pdf_data.get("error")}

    # -------------------------------------------------------------
    # 6. WORKSPACE & PROPOSAL TOOLS
    # e.g., "save note Decentralized Consensus Ideas: ...", "proposal stats", "list notes"
    # -------------------------------------------------------------
    note_match = re.search(r'(?:save note|create note|log note)\s+([^:]+):\s*(.+)', text, re.DOTALL)
    if note_match:
        n_title = note_match.group(1).strip()
        n_body = note_match.group(2).strip()
        res = save_research_note(n_title, n_body)
        db.add_log("Research Note Saved", f"Saved {res['filename']}", "RESEARCH", "file-text")
        return {
            "reply": f"Saved research note **{n_title}** to `{res['filename']}` ({res['bytes_written']} bytes).",
            "tool_used": "save_research_note",
            "data": res
        }

    if "proposal stats" in lower or "proposal length" in lower:
        default_proposal = r"d:\Japan Prep Temp\Nirmiti_Masters\Final_Formal_Research_Proposal.md"
        stats = analyze_proposal_stats(default_proposal)
        if stats["success"]:
            return {
                "reply": f"Proposal analysis for **{stats['filename']}**: {stats['word_count']} words across {stats['heading_count']} major sections (~{stats['estimated_reading_minutes']} min read).",
                "tool_used": "proposal_stats",
                "data": stats
            }
        else:
            return {"reply": "Could not locate proposal draft file.", "tool_used": "proposal_stats"}

    # -------------------------------------------------------------
    # 7. WEB DEEP-READ & PDF EXPORT
    # -------------------------------------------------------------
    url_match = re.search(r'(https?://[^\s]+|[a-zA-Z0-9_\-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?)', text)
    if ("summarize" in lower or "take notes" in lower or "export pdf" in lower or "read" in lower) and url_match:
        target_url = url_match.group(1)
        try:
            summary_res = await summarize_and_export_pdf(target_url)
            filename = summary_res["filename"]
            title = summary_res["title"]
            reply = f"Analyzed **{title}**! Extracted key takeaways and exported your formatted briefing to `{filename}`."
            db.add_log("Web Intelligence Briefing", f"Summarized {target_url} into {filename}", "INTELLIGENCE", "file-text")
            return {
                "reply": reply,
                "tool_used": "web_summarizer",
                "data": summary_res
            }
        except Exception as e:
            return {
                "reply": f"Attempted to inspect `{target_url}`, but encountered network friction: {str(e)}",
                "tool_used": "web_summarizer",
                "error": str(e)
            }

    # -------------------------------------------------------------
    # 8. ACADEMIC RESEARCH SATELLITE (ArXiv & BibTeX)
    # -------------------------------------------------------------
    research_match = re.search(r'(?:research|find paper(?:s)? on|paper on|literature review(?: on| for)?|arxiv)\s+(.+)', lower)
    if research_match or lower.startswith("research ") or lower.startswith("arxiv "):
        query = research_match.group(1).strip() if research_match else text.split(maxsplit=1)[-1].strip()
        try:
            res_data = await conduct_academic_research(query)
            if res_data["success"]:
                paper = res_data["paper"]
                pdf_file = res_data["pdf_filename"]
                reply = (
                    f"Found primary paper: **{paper['title']}** ({paper['year']}) by {', '.join(paper['authors'][:2])}.\n"
                    f"Synthesized research brief with BibTeX citation to `{pdf_file}`."
                )
                db.add_log("Academic Research Satellite", f"Synthesized '{paper['title'][:40]}...' into {pdf_file}", "ACADEMIC", "book-open")
                return {
                    "reply": reply,
                    "tool_used": "academic_researcher",
                    "data": res_data
                }
            else:
                return {
                    "reply": res_data.get("message", "No papers retrieved."),
                    "tool_used": "academic_researcher",
                    "data": res_data
                }
        except Exception as e:
            return {
                "reply": f"Academic satellite query failed for '{query}': {str(e)}",
                "tool_used": "academic_researcher",
                "error": str(e)
            }

    # -------------------------------------------------------------
    # 9. META-AGENT FACTORY (Spawn & Execute Sub-Agents)
    # -------------------------------------------------------------
    spawn_match = re.search(r'(?:spawn|deploy)\s+(?:a\s+)?(?:new\s+)?(?:sub-?agent|worker|agent)\s+(?:to|for)?\s*(.+)', lower)
    if spawn_match:
        task_desc = spawn_match.group(1).strip()
        import meta_agent_factory as maf
        ag = maf.spawn_subagent_from_prompt(task_desc)
        return {
            "reply": f"Meta-Agent Factory deployed **{ag['name']}** ({ag['role']})!\nTools bound: `{', '.join(ag['tools_bound'])}` | Schedule: `{ag['schedule']}`.",
            "tool_used": "meta_agent_factory",
            "data": ag
        }

    run_agent_match = re.search(r'(?:run|trigger)\s+(?:sub-?agent|agent|worker)\s+(.+)', lower)
    if run_agent_match:
        target_name = run_agent_match.group(1).strip().lower()
        import meta_agent_factory as maf
        agents = db.get_all_subagents()
        target_agent = None
        for a in agents:
            if target_name in a["name"].lower() or target_name in a["id"].lower() or target_name in a["role"].lower():
                target_agent = a
                break
        if target_agent:
            res = await maf.execute_subagent(target_agent["id"])
            return {
                "reply": f"Worker **{target_agent['name']}** executed:\n{res.get('output', 'Done.')}",
                "tool_used": "execute_subagent",
                "data": res
            }
        else:
            return {
                "reply": f"Could not find an active sub-agent matching '{target_name}'. Active workers: {', '.join([a['name'] for a in agents])}.",
                "tool_used": "execute_subagent"
            }

    # -------------------------------------------------------------
    # 10. SYSTEM TELEMETRY & OS CONTROL
    # -------------------------------------------------------------
    app_match = re.search(r'(?:open|launch|start)\s+([a-zA-Z0-9\s]+)', lower)
    if app_match and not any(w in lower for w in ["tracker", "roadmap", "project", "task", "domain"]):
        app_name = app_match.group(1).strip()
        res = launch_app(app_name)
        db.add_log("App Launched", f"Dispatched OS launcher for '{app_name}'", "OS", "external-link")
        return {
            "reply": f"Firing up **{app_name.title()}** right now.",
            "tool_used": "launch_app",
            "data": {"status": res}
        }

    if any(q in lower for q in ["system telemetry", "hardware status", "pc status", "specs", "ram usage", "cpu usage"]):
        telemetry = get_system_telemetry()
        return {
            "reply": f"Telemetry nominal: CPU at {telemetry['cpu_percent']}%, RAM at {telemetry['ram_percent']}% ({telemetry['ram_used_gb']} GB used), Disk at {telemetry['disk_percent']}%, Battery at {telemetry['battery_percent']}%.",
            "tool_used": "telemetry",
            "data": telemetry
        }

    # -------------------------------------------------------------
    # 11. CONVERSATIONAL HEURISTICS
    # -------------------------------------------------------------
    if lower in ["hello", "hey", "hi", "hey yomi", "yo", "morning", "good morning"]:
        greetings = [
            "Good to see you! Ready to make moves on your applications and research?",
            "Hey! All systems green and telemetry sharp. What are we conquering today?",
            "Present and operational. Master's trackers and research tools are all primed."
        ]
        return {"reply": random.choice(greetings), "tool_used": None}
        
    if "how are you" in lower:
        return {"reply": "Running at peak clock speeds with zero latency. How is your research session going?", "tool_used": None}
        
    if "who are you" in lower:
        return {"reply": "I'm Yomi—your executive AI companion, research strategist, and mission control chief of staff.", "tool_used": None}

    # -------------------------------------------------------------
    # 12. UNIFIED LLM REASONING (Ollama / Gemini / Groq with Memory Prompt)
    # -------------------------------------------------------------
    context_facts = memory.build_context_prompt()
    combined_system_prompt = f"{SYSTEM_PROMPT}\n\n{context_facts}"
    
    llm_res = await llm_client.generate_response(
        prompt=text,
        system_prompt=combined_system_prompt,
        temperature=0.7,
        max_tokens=300
    )

    if llm_res["success"] and llm_res["content"]:
        # Log conversation to memory
        memory.append_chat(session_id, "user", text)
        memory.append_chat(session_id, "assistant", llm_res["content"])
        return {
            "reply": llm_res["content"],
            "tool_used": f"llm_{llm_res['provider']}",
            "data": {"model": llm_res["model"]}
        }

    # Graceful synthesis fallback
    fallback_reply = f"Acknowledged '{text}'. All tools (Academic Satellite, Admissions Profiler, Web Search, Code Sandbox, System Telemetry) are online and ready."
    memory.append_chat(session_id, "user", text)
    memory.append_chat(session_id, "assistant", fallback_reply)
    return {
        "reply": fallback_reply,
        "tool_used": None
    }
