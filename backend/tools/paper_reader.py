import os
import sys
import re
from typing import Dict, Any, List, Optional
from pathlib import Path
import pypdf

# Import security containment
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
from config import validate_workspace_path

class DocumentReader:
    """
    Parses and extracts insights from local research papers, PDFs,
    admission guidelines, and academic transcripts within the workspace.
    """
    def __init__(self):
        pass

    def inspect_pdf(self, file_path: str, max_pages: int = 20) -> Dict[str, Any]:
        try:
            safe_file_path = str(validate_workspace_path(file_path))
        except PermissionError as pe:
            return {"success": False, "error": str(pe)}

        if not os.path.exists(safe_file_path):
            return {"success": False, "error": f"File does not exist: {safe_file_path}"}

        try:
            reader = pypdf.PdfReader(safe_file_path)
            num_pages = len(reader.pages)
            meta = reader.metadata or {}

            extracted_pages = []
            full_text = []

            for idx in range(min(num_pages, max_pages)):
                page = reader.pages[idx]
                text = page.extract_text() or ""
                extracted_pages.append({
                    "page_number": idx + 1,
                    "character_count": len(text),
                    "snippet": text[:300].strip()
                })
                full_text.append(f"--- Page {idx + 1} ---\n{text}")

            combined_text = "\n\n".join(full_text)

            # Detect abstract if academic paper
            abstract_match = re.search(r'(?:Abstract|ABSTRACT)[:\s\n]+(.*?)(?=\n\s*(?:I\.|1\.|Introduction|Index Terms|Keywords))', combined_text, re.DOTALL)
            abstract = abstract_match.group(1).strip() if abstract_match else ""
            if not abstract and len(combined_text) > 100:
                abstract = combined_text[:1200]

            return {
                "success": True,
                "file_path": safe_file_path,
                "filename": os.path.basename(safe_file_path),
                "total_pages": num_pages,
                "title": meta.get("/Title", os.path.basename(safe_file_path)),
                "author": meta.get("/Author", "Unknown"),
                "abstract": abstract[:1500],
                "pages": extracted_pages,
                "content_preview": combined_text[:3000]
            }
        except Exception as e:
            return {"success": False, "error": f"PDF parse error: {str(e)}"}

    def search_in_document(self, file_path: str, query: str) -> Dict[str, Any]:
        """Searches for specific terms or requirements inside a PDF document within workspace."""
        try:
            safe_file_path = str(validate_workspace_path(file_path))
        except PermissionError as pe:
            return {"success": False, "error": str(pe)}

        if not os.path.exists(safe_file_path):
            return {"success": False, "error": f"File not found: {safe_file_path}"}

        try:
            reader = pypdf.PdfReader(safe_file_path)
            results = []
            q_lower = query.lower()

            for idx, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                if q_lower in text.lower():
                    # Find matching paragraphs
                    paragraphs = text.split("\n\n")
                    snippets = [p.strip() for p in paragraphs if q_lower in p.lower()]
                    results.append({
                        "page": idx + 1,
                        "matches": snippets[:3]
                    })

            return {
                "success": True,
                "query": query,
                "filename": os.path.basename(safe_file_path),
                "occurrences": len(results),
                "results": results
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

document_reader = DocumentReader()
