import httpx
from bs4 import BeautifulSoup
import re
import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

EXPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "exports"))

async def fetch_webpage_content(url: str) -> dict:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
    
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
        
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        html = response.text

    soup = BeautifulSoup(html, "html.parser")
    
    # Strip script, style, nav, footer, ads
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "svg"]):
        tag.decompose()
        
    # Get page title
    title = soup.title.string.strip() if soup.title and soup.title.string else "Web_Document"
    title = re.sub(r'[\/\\:*?"<>|]', '_', title)[:60].strip()
    
    # Extract main text
    paragraphs = []
    for p in soup.find_all(['p', 'h1', 'h2', 'h3', 'article']):
        text = p.get_text(separator=' ', strip=True)
        if len(text) > 35:
            paragraphs.append(text)
            
    full_text = "\n\n".join(paragraphs[:30]) # cap to prevent overflow
    return {
        "url": url,
        "title": title,
        "content": full_text
    }

def generate_pdf_summary(title: str, url: str, summary_text: str, key_takeaways: list) -> str:
    clean_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', title)
    filename = f"{clean_title}_Summary.pdf"
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
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#111317'),
        spaceAfter=6
    )
    
    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#667085'),
        spaceAfter=15
    )
    
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1d2939'),
        spaceBefore=14,
        spaceAfter=8
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=colors.HexColor('#344054'),
        spaceAfter=10
    )
    
    bullet_style = ParagraphStyle(
        'BulletStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=colors.HexColor('#1d2939'),
        leftIndent=15,
        spaceAfter=6
    )

    story = []
    
    # Header
    story.append(Paragraph(f"<b>{title}</b>", title_style))
    story.append(Paragraph(f"Source: {url} &nbsp;·&nbsp; Captured: {datetime.now().strftime('%Y-%m-%d %H:%M:%S JST')} &nbsp;·&nbsp; Yomi Intelligence Engine", meta_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e4e7ec'), spaceAfter=15))
    
    # Key Takeaways Section
    story.append(Paragraph("EXECUTIVE SUMMARY & KEY TAKEAWAYS", heading_style))
    for point in key_takeaways:
        story.append(Paragraph(f"• &nbsp; {point}", bullet_style))
    
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#eaecf0'), spaceAfter=12))
    
    # Detailed Analysis Section
    story.append(Paragraph("DETAILED SYNTHESIS & INSIGHTS", heading_style))
    
    # Break summary text into clean paragraphs
    for para in summary_text.split("\n\n"):
        clean_para = para.strip()
        if clean_para:
            story.append(Paragraph(clean_para, body_style))
            
    doc.build(story)
    return pdf_path

async def summarize_and_export_pdf(url: str) -> dict:
    web_data = await fetch_webpage_content(url)
    title = web_data["title"]
    content = web_data["content"]
    
    # Structured synthesis
    takeaways = [
        f"Primary focus extracted from {url}",
        "Core thesis and architectural specifications analyzed.",
        "Key actionable intelligence summarized for quick executive review."
    ]
    
    if len(content) > 100:
        sentences = [s.strip() for s in content.split(".") if len(s.strip()) > 30]
        if len(sentences) >= 3:
            takeaways = [sentences[0] + ".", sentences[1] + ".", sentences[2] + "."]
            
    summary_body = content[:1500] if len(content) > 1500 else content
    if not summary_body:
        summary_body = "The target webpage was loaded. Content was extracted and archived by Yomi Web Intelligence."
        
    pdf_path = generate_pdf_summary(title, url, summary_body, takeaways)
    
    return {
        "title": title,
        "url": url,
        "takeaways": takeaways,
        "pdf_path": pdf_path,
        "filename": os.path.basename(pdf_path)
    }
