import os
from datetime import datetime, date
from typing import Dict, Any, List, Optional
import json
from config import WORKSPACE_ROOT

TARGET_UNIVERSITIES: Dict[str, Any] = {}

def load_target_universities() -> Dict[str, Any]:
    global TARGET_UNIVERSITIES
    if TARGET_UNIVERSITIES:
        return TARGET_UNIVERSITIES
    targets_path = WORKSPACE_ROOT / "admissions.json"
    if targets_path.exists():
        try:
            TARGET_UNIVERSITIES = json.loads(targets_path.read_text(encoding="utf-8-sig"))
            return TARGET_UNIVERSITIES
        except Exception:
            return {}
    return {}

TARGET_UNIVERSITIES = load_target_universities()

def get_target_universities_summary() -> List[Dict[str, Any]]:
    today = date.today()
    summary = []
    universities = load_target_universities()
    for uid, uni in universities.items():
        # Find next relevant deadline
        deadlines = []
        for k, d_str in uni.get("key_dates", {}).items():
            if len(d_str) >= 10 and d_str[:4].isdigit():
                try:
                    target_date = datetime.strptime(d_str[:10], "%Y-%m-%d").date()
                    delta = (target_date - today).days
                    deadlines.append({
                        "event": k.replace("_", " ").title(),
                        "date": d_str,
                        "days_left": delta,
                        "urgent": 0 <= delta <= 30
                    })
                except Exception:
                    pass

        summary.append({
            "id": uid,
            "name": uni.get("name", uid),
            "program": uni.get("program", ""),
            "advisors": uni.get("advisors", []),
            "deadlines": deadlines,
            "portal": uni.get("portal", "")
        })
    return summary

def sync_admissions_pipeline() -> Dict[str, Any]:
    """
    Synchronizes admissions deadlines and research milestones into SQLite tasks.db.
    Automatically provisions domain, projects, and prioritized actionable tasks.
    """
    from database import get_connection, add_log
    
    universities = load_target_universities()
    if not universities:
        return {"status": "skipped", "message": "No admissions data found", "synced_count": 0}

    conn = get_connection()
    today = date.today()
    created_tasks = []
    
    try:
        # 1. Ensure Admissions Domain exists
        dom_row = conn.execute("SELECT id FROM domains WHERE id = 'dom_admissions'").fetchone()
        if not dom_row:
            conn.execute(
                "INSERT INTO domains (id, name, icon, color, description) VALUES (?, ?, ?, ?, ?)",
                ("dom_admissions", "Admissions & Dossier", "graduation-cap", "#ffc3d7", "University admissions, supervisor outreach, and official portals")
            )

        for uid, uni in universities.items():
            proj_id = f"proj_adm_{uid}"
            proj_row = conn.execute("SELECT id FROM projects WHERE id = ?", (proj_id,)).fetchone()
            if not proj_row:
                conn.execute(
                    "INSERT INTO projects (id, domain_id, title, status, progress, target_date) VALUES (?, ?, ?, 'Active', 0, ?)",
                    (proj_id, "dom_admissions", uni.get("name", uid), None)
                )

            # Check key dates and create actionable tasks
            for event_key, d_str in uni.get("key_dates", {}).items():
                if len(d_str) >= 10 and d_str[:4].isdigit():
                    try:
                        target_date = datetime.strptime(d_str[:10], "%Y-%m-%d").date()
                        delta = (target_date - today).days
                        
                        # Only track upcoming or recently passed milestones (within last 7 days)
                        if delta >= -7:
                            event_label = event_key.replace("_", " ").title()
                            task_title = f"[{uni.get('name', uid).split(' ')[0]}] {event_label}: {d_str}"
                            
                            # Priority based on urgency
                            if delta <= 14:
                                priority = "P1"
                            elif delta <= 30:
                                priority = "P2"
                            else:
                                priority = "P3"

                            # Avoid duplicate tasks for the same project and milestone
                            existing = conn.execute(
                                "SELECT id FROM tasks WHERE project_id = ? AND title LIKE ?",
                                (proj_id, f"%{event_label}%")
                            ).fetchone()

                            if not existing:
                                import uuid, time
                                task_id = f"task_adm_{int(time.time())}_{uuid.uuid4().hex[:6]}"
                                conn.execute(
                                    "INSERT INTO tasks (id, domain_id, project_id, title, priority, status, is_completed, due_date) VALUES (?, ?, ?, ?, ?, 'Pending', 0, ?)",
                                    (task_id, "dom_admissions", proj_id, task_title, priority, d_str[:10])
                                )
                                created_tasks.append({
                                    "id": task_id,
                                    "title": task_title,
                                    "priority": priority,
                                    "due_date": d_str[:10],
                                    "days_left": delta
                                })
                    except Exception:
                        continue

        conn.commit()
    finally:
        conn.close()

    if created_tasks:
        add_log("Admissions Synced", f"Synchronized {len(created_tasks)} admission deadline tasks into pipeline", "ADMISSIONS", "calendar-check")

    return {
        "status": "success",
        "synced_universities": len(universities),
        "created_tasks_count": len(created_tasks),
        "created_tasks": created_tasks
    }

def calculate_lab_match(proposal_keywords: List[str], target_lab_id: str) -> Dict[str, Any]:
    """Calculates transparent keyword overlap between proposal keywords and lab research topics."""
    universities = load_target_universities()
    if target_lab_id not in universities:
        return {"error": f"Unknown target: {target_lab_id}"}

    uni = universities[target_lab_id]
    matches = []
    
    clean_user_kw = set(k.lower().strip() for k in proposal_keywords if k.strip())
    
    for adv in uni.get("advisors", []):
        lab_topics = [t.lower() for t in adv.get("topics", [])]
        
        # Deduplicated match calculation
        matched_topics = set()
        if clean_user_kw:
            for t in lab_topics:
                if any(k in t or t in k for k in clean_user_kw):
                    matched_topics.add(t)
        
        score = int((len(matched_topics) / max(1, len(lab_topics))) * 100) if clean_user_kw else 0
        matches.append({
            "professor": adv.get("name", "Unknown"),
            "lab": adv.get("lab", "Unknown"),
            "match_score": score,
            "overlap_topics": sorted(list(matched_topics)),
            "all_topics": adv.get("topics", [])
        })

    return {
        "university": uni.get("name", target_lab_id),
        "advisors_match": matches
    }

def draft_academic_email(
    professor_name: str,
    university_name: str,
    research_topic: str,
    email_purpose: str = "inquiry",  # 'inquiry', 'followup', 'export_control', 'interview_prep'
    user_name: str = "Candidate"
) -> Dict[str, str]:
    """Drafts formal academic correspondence meeting Japanese institutional norms."""
    clean_prof = professor_name
    for prefix in ["Prof. ", "Professor ", "Dr. "]:
        if clean_prof.startswith(prefix):
            clean_prof = clean_prof[len(prefix):].strip()

    if email_purpose == "inquiry":
        subject = f"Inquiry regarding Prospective Master's Research (AY2027) — {user_name}"
        body = f"""Dear Professor {clean_prof},

I hope this email finds you well and having a productive semester.

I am interested in studying {research_topic} at {university_name}. Are you considering prospective graduate students?

Thank you very much for your precious time and consideration.

Respectfully yours,

{user_name}
"""
    elif email_purpose == "followup":
        subject = f"Follow-up: Graduate Application Materials — {user_name}"
        body = f"""Dear Professor {clean_prof},

Thank you very much for your guidance and recent communications regarding the application procedures at {university_name}.

I have completed and updated all requested documentation, and I am actively monitoring the application portal to ensure all institutional deadlines and requirements are strictly fulfilled.

If any supplementary information, portfolio demonstrations, or clarifications regarding my academic background are helpful, I remain readily at your disposal.

With sincere appreciation for your time and guidance,

Respectfully yours,

{user_name}
"""
    else:
        subject = f"Academic Update — {user_name}"
        body = f"""Dear Professor {clean_prof},\n\nI hope this email finds you well.\n\nI am writing to provide an update regarding my research preparation on {research_topic}.\n\nBest regards,\n{user_name}"""

    return {
        "subject": subject,
        "body": body,
        "recipient": f"Prof. {clean_prof}",
        "university": university_name
    }

