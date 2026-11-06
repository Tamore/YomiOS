import os
from datetime import datetime
from typing import Dict, Any, List, Optional

WORKSPACE_ROOTS = [
    r"d:\Japan Prep Temp",
    r"D:\Projects\yomi-assistant"
]

def list_workspace_files(folder_path: Optional[str] = None, extension: Optional[str] = None) -> List[Dict[str, Any]]:
    target_dir = folder_path if folder_path and os.path.exists(folder_path) else WORKSPACE_ROOTS[0]
    entries = []
    try:
        for root, dirs, files in os.walk(target_dir):
            # Skip hidden and cache folders
            dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ["node_modules", "__pycache__", "dist", ".git"]]
            for f in files:
                if extension and not f.endswith(extension):
                    continue
                full_path = os.path.join(root, f)
                try:
                    stat = os.stat(full_path)
                    entries.append({
                        "name": f,
                        "path": full_path,
                        "size_kb": round(stat.st_size / 1024, 2),
                        "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                    })
                except Exception:
                    pass
                if len(entries) >= 50:
                    break
            if len(entries) >= 50:
                break
    except Exception:
        pass
    return entries

def save_research_note(title: str, content: str, folder: Optional[str] = None) -> Dict[str, Any]:
    safe_title = "".join(c for c in title if c.isalnum() or c in (" ", "-", "_")).rstrip()
    filename = f"{safe_title.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    
    target_dir = folder or os.path.join(r"d:\Japan Prep Temp\Nirmiti_Masters", "Research_Notes")
    os.makedirs(target_dir, exist_ok=True)
    full_path = os.path.join(target_dir, filename)

    with open(full_path, "w", encoding="utf-8") as f:
        f.write(f"# {title}\n")
        f.write(f"*Logged by Yomi OS on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n")
        f.write(content)

    return {
        "success": True,
        "title": title,
        "filename": filename,
        "path": full_path,
        "bytes_written": len(content)
    }

def analyze_proposal_stats(file_path: str) -> Dict[str, Any]:
    """Analyzes word count, section count, and readability of a research proposal document."""
    if not os.path.exists(file_path):
        return {"success": False, "error": "File does not exist."}

    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

        words = text.split()
        lines = text.splitlines()
        headings = [l for l in lines if l.strip().startswith("#")]

        return {
            "success": True,
            "filename": os.path.basename(file_path),
            "word_count": len(words),
            "line_count": len(lines),
            "heading_count": len(headings),
            "headings": headings[:15],
            "estimated_reading_minutes": round(len(words) / 220, 1)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

