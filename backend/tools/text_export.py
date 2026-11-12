"""Export supplied text verbatim to a local PDF, without LLM rewriting."""
from html import escape
from uuid import uuid4
from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from config import EXPORTS_DIR


def export_text_pdf(content: str, title: str = "Yomi notes") -> dict:
    if not content.strip() or len(content) > 100000:
        raise ValueError("Supply between 1 and 100000 characters.")
    font = "Helvetica"
    for candidate in [Path("C:/Windows/Fonts/arial.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")]:
        if candidate.exists():
            if "YomiText" not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont("YomiText", str(candidate)))
            font = "YomiText"
            break
    filename = f"notes-{uuid4().hex}.pdf"
    path = Path(EXPORTS_DIR) / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    body = ParagraphStyle("Body", fontName=font, fontSize=11, leading=16, spaceAfter=5, splitLongWords=True)
    heading = ParagraphStyle("Heading", parent=body, fontSize=18, leading=24, spaceAfter=16)
    story = [Paragraph(escape(title[:160]), heading)]
    for line in content.splitlines():
        story.append(Paragraph(escape(line), body) if line.strip() else Spacer(1, 8))
    SimpleDocTemplate(str(path), leftMargin=48, rightMargin=48, topMargin=48, bottomMargin=48).build(story)
    return {"filename": filename, "pdf_download_url": f"http://127.0.0.1:8765/api/exports/{filename}"}
