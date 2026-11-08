import os
from datetime import datetime, date
from typing import Dict, Any, List, Optional

import json
from config import WORKSPACE_ROOT

targets_path = WORKSPACE_ROOT / "admissions.json"
TARGET_UNIVERSITIES = json.loads(targets_path.read_text(encoding="utf-8")) if targets_path.exists() else {}

def get_target_universities_summary() -> List[Dict[str, Any]]:
    today = date.today()
    summary = []
    for uid, uni in TARGET_UNIVERSITIES.items():
        # Find next relevant deadline
        deadlines = []
        for k, d_str in uni["key_dates"].items():
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
            "name": uni["name"],
            "program": uni["program"],
            "advisors": uni["advisors"],
            "deadlines": deadlines,
            "portal": uni["portal"]
        })
    return summary

def calculate_lab_match(proposal_keywords: List[str], target_lab_id: str) -> Dict[str, Any]:
    """Calculates transparent keyword overlap between proposal keywords and lab research topics."""
    if target_lab_id not in TARGET_UNIVERSITIES:
        return {"error": f"Unknown target: {target_lab_id}"}

    uni = TARGET_UNIVERSITIES[target_lab_id]
    matches = []
    
    clean_user_kw = set(k.lower().strip() for k in proposal_keywords if k.strip())
    
    for adv in uni["advisors"]:
        lab_topics = [t.lower() for t in adv["topics"]]
        
        # Deduplicated match calculation
        matched_topics = set()
        if clean_user_kw:
            for t in lab_topics:
                if any(k in t or t in k for k in clean_user_kw):
                    matched_topics.add(t)
        
        # Zero overlap produces 0% score; no arbitrary +40 bias
        score = int((len(matched_topics) / max(1, len(lab_topics))) * 100) if clean_user_kw else 0
        matches.append({
            "professor": adv["name"],
            "lab": adv["lab"],
            "match_score": score,
            "overlap_topics": sorted(list(matched_topics)),
            "all_topics": adv["topics"]
        })

    return {
        "university": uni["name"],
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
    if email_purpose == "inquiry":
        subject = f"Inquiry regarding Prospective Master's Research (AY2027) — {user_name}"
        body = f"""Dear Professor {professor_name},

I hope this email finds you well and having a productive semester.

I am interested in studying {research_topic} at {university_name}. Are you considering prospective graduate students?

Thank you very much for your precious time and consideration.

Respectfully yours,

{user_name}
"""
    elif email_purpose == "followup":
        subject = f"Follow-up: Graduate Application Materials — {user_name}"
        body = f"""Dear Professor {professor_name},

Thank you very much for your guidance and recent communications regarding the application procedures at {university_name}.

I have completed and updated all requested documentation, and I am actively monitoring the application portal to ensure all institutional deadlines and requirements are strictly fulfilled.

If any supplementary information, portfolio demonstrations, or clarifications regarding my academic background are helpful, I remain readily at your disposal.

With sincere appreciation for your time and guidance,

Respectfully yours,

{user_name}
"""
    else:
        subject = f"Academic Update — {user_name}"
        body = f"""Dear Professor {professor_name},\n\nI hope this email finds you well.\n\nI am writing to provide an update regarding my research preparation on {research_topic}.\n\nBest regards,\n{user_name}"""

    return {
        "subject": subject,
        "body": body,
        "recipient": professor_name,
        "university": university_name
    }

