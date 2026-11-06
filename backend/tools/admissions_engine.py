import os
from datetime import datetime, date
from typing import Dict, Any, List, Optional

# Database of target universities, labs, and deadlines for AY2027 admissions
TARGET_UNIVERSITIES = {
    "sit": {
        "id": "sit",
        "name": "Shibaura Institute of Technology (SIT)",
        "campus": "Toyosu, Tokyo",
        "program": "Master of Engineering (Computer Science & Engineering)",
        "advisors": [
            {
                "name": "Prof. Hiroaki Fukuda",
                "lab": "Distributed & Autonomous Software Systems Lab",
                "email": "hiroaki@shibaura-it.ac.jp",
                "topics": ["Distributed Systems", "Self-Adaptive Software", "Software Architecture", "Autonomous Agents", "Cloud-Edge Coordination"],
                "status": "Export Control Review response submitted (Nov 6, 2026); Awaiting TAO pre-consultation formal approval"
            }
        ],
        "key_dates": {
            "pre_consultation_deadline": "Completed / Under Review",
            "formal_application_deadline": "2026-11-20",
            "interview_period": "2026-12-15 to 2026-12-22",
            "results_announcement": "2027-01-15"
        },
        "portal": "TAO (The Admissions Office)"
    },
    "waseda_ips": {
        "id": "waseda_ips",
        "name": "Waseda University (Graduate School of Information, Production and Systems - IPS)",
        "campus": "Kitakyushu, Fukuoka",
        "program": "Master of Engineering (Information Architecture)",
        "advisors": [
            {
                "name": "Prof. Shigeru Fujimura",
                "lab": "Distributed Information Systems Lab",
                "topics": ["Distributed Transaction Processing", "Autonomous Consensus", "Workflow Automation", "Enterprise Systems"],
                "status": "Target for AY2027 Spring. Pre-matching documentation being organized."
            }
        ],
        "key_dates": {
            "application_window_start": "2026-12-07",
            "application_window_end": "2026-12-18",
            "interview_date": "2027-01-20",
            "results_announcement": "2027-02-12"
        },
        "portal": "Waseda Online Application System"
    },
    "naist": {
        "id": "naist",
        "name": "Nara Institute of Science and Technology (NAIST)",
        "campus": "Ikoma, Nara",
        "program": "Master of Science and Technology (Information Science)",
        "advisors": [
            {
                "name": "Prof. Michiko Inoue",
                "lab": "Dependable Software Systems Laboratory",
                "topics": ["Fault Tolerance", "Dependable Distributed Systems", "Hardware/Software Reliability", "Self-Checking Architectures"],
                "status": "Pre-screening permissible window closing Dec 8, 2026."
            }
        ],
        "key_dates": {
            "pre_screening_deadline": "2026-12-08",
            "formal_application_end": "2027-01-10",
            "exam_date": "2027-01-28"
        },
        "portal": "NAIST Web Application Portal"
    },
    "science_tokyo": {
        "id": "science_tokyo",
        "name": "Institute of Science Tokyo (formerly Tokyo Institute of Technology)",
        "campus": "Ookayama / Suzukakedai, Tokyo",
        "program": "International Graduate Program (IGP-C) - Computer Science",
        "advisors": [
            {
                "name": "Prof. Kenji Tei",
                "lab": "Autonomous & Adaptive Software Systems Lab",
                "topics": ["Self-Adaptive Systems", "MAPE-K Loop", "Dynamic Software Evolution", "Microservices Optimization"],
                "status": "IGP(C) Application Window opens January 2027."
            },
            {
                "name": "Prof. Xavier Défago",
                "lab": "Distributed & Dependable Computing Lab",
                "topics": ["Byzantine Fault Tolerance", "Decentralized Consensus", "Mobile Autonomous Robots", "Fault-Tolerant Algorithms"],
                "status": "IGP(C) Application Window opens January 2027."
            }
        ],
        "key_dates": {
            "igp_c_application_start": "2027-01-10",
            "igp_c_application_end": "2027-01-25",
            "selection_results": "2027-03-10"
        },
        "portal": "Tokyo Tech Admissions Online"
    },
    "ritsumeikan": {
        "id": "ritsumeikan",
        "name": "Ritsumeikan University",
        "campus": "Biwako-Kusatsu (BKC), Shiga",
        "program": "Graduate School of Information Science and Engineering / Space & Earth System Science (FREX)",
        "advisors": [
            {
                "name": "Prof. Shinichi Nakasuka",
                "lab": "Space Systems & Intelligent Satellite Lab (FREX)",
                "topics": ["Micro-Satellites", "Autonomous Spacecraft Navigation", "Distributed Satellite Constellations"],
                "status": "Attending FREX Masterclass on Nov 28, 2026."
            }
        ],
        "key_dates": {
            "frex_masterclass_date": "2026-11-28 17:30 IST",
            "spring_intake_window": "2027-01-05 to 2027-01-20"
        },
        "portal": "Ritsumeikan Online Admissions"
    }
}

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
    """Calculates thematic overlap score between user proposal keywords and lab research topics."""
    if target_lab_id not in TARGET_UNIVERSITIES:
        return {"error": f"Unknown target: {target_lab_id}"}

    uni = TARGET_UNIVERSITIES[target_lab_id]
    matches = []
    
    for adv in uni["advisors"]:
        lab_topics = [t.lower() for t in adv["topics"]]
        user_kw = [k.lower().strip() for k in proposal_keywords]
        
        overlap = []
        for k in user_kw:
            for t in lab_topics:
                if k in t or t in k:
                    overlap.append(t)
        
        score = min(100, int((len(overlap) / max(1, len(lab_topics))) * 100) + 40)
        matches.append({
            "professor": adv["name"],
            "lab": adv["lab"],
            "match_score": score,
            "overlap_topics": list(set(overlap)),
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
    user_name: str = "Nirmiti Ramesh Tamore"
) -> Dict[str, str]:
    """Drafts formal academic correspondence meeting Japanese institutional norms."""
    if email_purpose == "inquiry":
        subject = f"Inquiry regarding Prospective Master's Research (AY2027) — {user_name}"
        body = f"""Dear Professor {professor_name},

I hope this email finds you well and having a productive semester.

My name is {user_name}, and I graduated with a B.Tech in Computer Science and Engineering from Sandip University (First Class with Distinction). I am writing to express my earnest enthusiasm for prospective graduate studies in your laboratory at {university_name} for the Academic Year 2027.

I have closely followed your laboratory's groundbreaking work, particularly in {research_topic}. My academic background focuses on distributed systems, self-adaptive autonomous software, and decentralized coordination protocols. During my independent research, I designed distributed consensus mechanisms and authored preprints exploring adaptive fault tolerance.

I have reviewed your recent publications and would be deeply honored if you might consider my profile for Master’s advisement under your supervision. I have prepared a comprehensive research proposal and curriculum vitae which I would welcome the opportunity to share for your feedback.

Thank you very much for your precious time and consideration.

Respectfully yours,

{user_name}
Email: nirmiti.tamore@gmail.com
Portfolio: https://github.com/nirmiti
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

