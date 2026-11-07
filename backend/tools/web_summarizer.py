import httpx
from bs4 import BeautifulSoup
import re
import os
import sys
import html
import uuid
import time
from datetime import datetime
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

# Register Japanese Unicode CIDFont for Japanese, Greek, math, and symbol rendering
FONT_HEADING = 'Helvetica-Bold'
FONT_BODY = 'Helvetica'
FONT_CODE = 'Courier'

try:
    pdfmetrics.registerFont(UnicodeCIDFont('HeiseiKakuGo-W5'))
    pdfmetrics.registerFont(UnicodeCIDFont('HeiseiMin-W3'))
    FONT_HEADING = 'HeiseiKakuGo-W5'
    FONT_BODY = 'HeiseiMin-W3'
except Exception:
    pass

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
from config import safe_http_get, validate_safe_url

from config import EXPORTS_DIR

async def fetch_webpage_content(url: str) -> dict:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
    
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    response = await safe_http_get(url, timeout=15.0, headers=headers)
    response.raise_for_status()
    page_html = response.text

    soup = BeautifulSoup(page_html, "html.parser")
    
    # Strip script, style, nav, footer, ads
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "svg"]):
        tag.decompose()
        
    # Get page title
    title = soup.title.string.strip() if soup.title and soup.title.string else "Web_Document"
    title = re.sub(r'[\/\\:*?"<>|]', '_', title)[:60].strip()
    
    # Extract main text without double-counting nested articles
    paragraphs = []
    for p in soup.find_all(['h1', 'h2', 'h3', 'p']):
        text = p.get_text(separator=' ', strip=True)
        if len(text) > 35 and text not in paragraphs:
            paragraphs.append(text)
            
    full_text = "\n\n".join(paragraphs[:30]) # cap to prevent overflow
    return {
        "url": url,
        "title": title,
        "content": full_text
    }

def generate_pdf_summary(title: str, url: str, summary_text: str, key_takeaways: list) -> str:
    clean_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', title)
    clean_title = re.sub(r'_+', '_', clean_title).strip('_')[:35]
    if not clean_title:
        clean_title = "Web_Document"
    unique_suffix = f"{int(time.time())}_{uuid.uuid4().hex[:6]}"
    filename = f"{clean_title}_{unique_suffix}_Summary.pdf"
    pdf_path = os.path.join(EXPORTS_DIR, filename)
    
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=45,
        leftMargin=45,
        topMargin=45,
        bottomMargin=45
    )
    
    styles = getSampleStyleSheet()
    
    # Minimalist Monochromatic Styling (Matching Yomi Backlit Aesthetic)
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName=FONT_HEADING,
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#111317'),
        spaceAfter=6
    )
    
    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontName=FONT_BODY,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#667085'),
        spaceAfter=15
    )
    
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName=FONT_HEADING,
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1d2939'),
        spaceBefore=14,
        spaceAfter=8
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName=FONT_BODY,
        fontSize=10,
        leading=15,
        textColor=colors.HexColor('#344054'),
        spaceAfter=10
    )
    
    bullet_style = ParagraphStyle(
        'BulletStyle',
        parent=styles['Normal'],
        fontName=FONT_BODY,
        fontSize=10,
        leading=15,
        textColor=colors.HexColor('#1d2939'),
        leftIndent=15,
        spaceAfter=6
    )

    story = []
    
    # Header with real timezone
    now_str = datetime.now().astimezone().strftime('%Y-%m-%d %H:%M %Z')
    story.append(Paragraph(f"<b>{html.escape(title)}</b>", title_style))
    story.append(Paragraph(f"Source: {html.escape(url)} &nbsp;·&nbsp; Captured: {now_str} &nbsp;·&nbsp; Yomi Intelligence Engine", meta_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e4e7ec'), spaceAfter=15))
    
    # Key Takeaways Section
    story.append(Paragraph("KEY PASSAGES & EXTRACTED BULLETS", heading_style))
    for point in key_takeaways:
        story.append(Paragraph(f"• &nbsp; {html.escape(point)}", bullet_style))
    
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#eaecf0'), spaceAfter=12))
    
    # Detailed Analysis Section
    story.append(Paragraph("CAPTURED WEB EXCERPTS", heading_style))
    
    # Break summary text into clean paragraphs
    for para in summary_text.split("\n\n"):
        clean_para = para.strip()
        if clean_para:
            story.append(Paragraph(html.escape(clean_para), body_style))
            
    doc.build(story)
    return pdf_path

async def summarize_and_export_pdf(url: str) -> dict:
    web_data = await fetch_webpage_content(url)
    title = web_data["title"]
    content = web_data["content"]
    
    if not content or len(content.strip()) < 50:
        return {
            "success": False,
            "error": "No extractable body text found on webpage. The target site may be dynamic (SPA), require cookies/login, or block scrapers.",
            "url": url,
            "title": title
        }

    # Structured sentence extraction
    sentences = [s.strip() for s in content.split(".") if len(s.strip()) > 30]
    if len(sentences) >= 3:
        takeaways = [sentences[0] + ".", sentences[1] + ".", sentences[2] + "."]
    else:
        takeaways = [f"Captured direct text excerpt from {url}."]
            
    summary_body = content[:2000] if len(content) > 2000 else content
    pdf_path = generate_pdf_summary(title, url, summary_body, takeaways)
    
    return {
        "success": True,
        "title": title,
        "url": url,
        "takeaways": takeaways,
        "pdf_path": pdf_path,
        "filename": os.path.basename(pdf_path)
    }
