"""Turn selected syllabus headings into a reviewable, source-linked task list."""
import hashlib
import json
import re
from contextlib import closing

import database
import memory
import reference_documents

HEADING = re.compile(r"^(?:#{1,4}\s+|(?:unit|module|chapter|week|lesson|section)\s+[\w.-]+\b|第\s*[\d一二三四五六七八九十]+\s*[課章節]|\d{1,2}[.)]\s+)", re.I)


def checklist():
    with reference_documents.connect() as conn:
        docs = conn.execute("SELECT name,text FROM documents WHERE selected=1 ORDER BY name,id").fetchall()
    if not docs:
        return {"reply": "Select your syllabus in Dashboard → Documents, then ask for a study checklist."}
    items = []
    for doc in docs:
        lines = doc["text"].splitlines()
        headings = [(n, line.strip()) for n, line in enumerate(lines, 1)
                    if HEADING.match(line.strip()) and len(line.strip()) <= 180]
        for n, heading in headings:
            items.append(f"Study {heading.lstrip('# ').strip()} ({doc['name']}, line {n})")
    if not items:
        return {"reply": "I couldn't identify numbered lessons or section headings in the selected text. You can still ask questions about the document."}
    return {"reply": "\n".join(f"{i}. {title}" for i, title in enumerate(items, 1))
            + "\nSay “save this checklist” to add these to Tasks.",
            "tool_used": "study_checklist", "data": {"items": items}}


def save_checklist(session_id):
    for message in reversed(memory.get_session_chat_history(session_id)):
        if message["role"] != "assistant":
            continue
        meta = json.loads(message["tool_calls"] or "{}")
        if meta.get("tool_used") == "study_checklist":
            break
    else:
        return {"reply": "Ask me to make a study checklist from your selected syllabus first."}
    items = meta["data"]["items"]
    with closing(database.get_connection()) as conn, conn:
        before = conn.total_changes
        for title in items:
            key = hashlib.sha256((session_id + "\0" + title).encode()).hexdigest()
            conn.execute("INSERT INTO tasks(id,title,priority) VALUES(?,?,'P2') ON CONFLICT(id) DO NOTHING",
                         ("study_" + key, title))
        count = conn.total_changes - before
    return {"reply": f"Added {count} study tasks." if count else "These study tasks are already saved.",
            "tool_used": "task_manager", "data": {"task_modified": bool(count)}}
