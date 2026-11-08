import os
import sys
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

# Import security containment
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
from config import validate_workspace_path, validate_safe_subfolder, WORKSPACE_ROOT

DEFAULT_NOTES_DIR = (WORKSPACE_ROOT / "exports" / "Research_Notes").resolve()
DEFAULT_NOTES_DIR.mkdir(parents=True, exist_ok=True)

def list_workspace_files(folder_path: Optional[str] = None, extension: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lists files safely contained strictly within the designated workspace root."""
    try:
        target_dir = validate_workspace_path(folder_path) if folder_path else WORKSPACE_ROOT
    except PermissionError:
        return []

    if not target_dir.exists() or not target_dir.is_dir():
        return []

    entries = []
    try:
        for root, dirs, files in os.walk(str(target_dir)):
            # Skip hidden and cache folders
            dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ["node_modules", "__pycache__", "dist", ".git", "venv", ".venv"]]
            for f in sorted(files):
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
    """Safely saves a markdown research note strictly within the workspace."""
    safe_title = "".join(c for c in title if c.isalnum() or c in (" ", "-", "_")).rstrip()
    if not safe_title:
        safe_title = "Research_Note"
    filename = f"{safe_title.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"

    try:
        if folder:
            target_dir = validate_workspace_path(folder)
        else:
            target_dir = DEFAULT_NOTES_DIR
    except PermissionError as pe:
        return {"success": False, "error": str(pe)}

    os.makedirs(str(target_dir), exist_ok=True)
    full_path = target_dir / filename

    try:
        with open(str(full_path), "w", encoding="utf-8") as f:
            f.write(f"# {title}\n")
            f.write(f"*Logged by Yomi OS on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n")
            f.write(content)

        return {
            "success": True,
            "title": title,
            "filename": filename,
            "path": str(full_path),
            "bytes_written": len(content)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def analyze_proposal_stats(file_path: str) -> Dict[str, Any]:
    """Analyzes word count, section count, and readability of a research proposal document within workspace."""
    try:
        safe_path = validate_workspace_path(file_path)
    except PermissionError as pe:
        return {"success": False, "error": str(pe)}

    if not safe_path.exists():
        return {"success": False, "error": f"File does not exist: {file_path}"}

    try:
        with open(str(safe_path), "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

        words = text.split()
        lines = text.splitlines()
        headings = [l for l in lines if l.strip().startswith("#")]

        return {
            "success": True,
            "filename": safe_path.name,
            "word_count": len(words),
            "line_count": len(lines),
            "heading_count": len(headings),
            "headings": headings[:15],
            "estimated_reading_minutes": round(len(words) / 220, 1)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
