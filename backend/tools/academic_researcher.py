import os
import re
import xml.etree.ElementTree as ET
import html
import uuid
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
import httpx
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

# Register Japanese Unicode CIDFont for Japanese, Greek, math, and scientific symbol rendering
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

from config import EXPORTS_DIR
os.makedirs(EXPORTS_DIR, exist_ok=True)

ARXIV_API_URL = "https://export.arxiv.org/api/query"
SEMANTIC_SCHOLAR_URL = "https://api.semanticscholar.org/graph/v1/paper/search"

# ---------------------------------------------------------------------------
# 1. SearchAgent: Query ArXiv & Semantic Scholar
# ---------------------------------------------------------------------------

async def search_arxiv(query: str, max_results: int = 3) -> List[Dict[str, Any]]:
    """Queries ArXiv API and returns structured paper metadata."""
    clean_query = query.strip()
    # Check if query is an arxiv ID (e.g., 2305.12345 or arxiv:2305.12345)
    id_match = re.search(r'(\d{4}\.\d{4,5})', clean_query)
    if id_match:
        params = {"id_list": id_match.group(1)}
    else:
        params = {
            "search_query": f"all:{clean_query}",
            "start": 0,
            "max_results": max_results,
            "sortBy": "relevance",
            "sortOrder": "descending"
        }

    papers = []
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(ARXIV_API_URL, params=params)
            resp.raise_for_status()
            xml_data = resp.text

        root = ET.fromstring(xml_data)
        ns = {"atom": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}

        for entry in root.findall("atom:entry", ns):
            title = entry.find("atom:title", ns)
            summary = entry.find("atom:summary", ns)
            published = entry.find("atom:published", ns)
            id_tag = entry.find("atom:id", ns)

            if title is None or summary is None:
                continue

            clean_title = re.sub(r'\s+', ' ', title.text).strip()
            clean_summary = re.sub(r'\s+', ' ', summary.text).strip()
            pub_date = published.text[:10] if published is not None and published.text else "N/A"
            paper_id = id_tag.text.split("/")[-1] if id_tag is not None and id_tag.text else "N/A"

            authors = []
            for author in entry.findall("atom:author", ns):
                name = author.find("atom:name", ns)
                if name is not None and name.text:
                    authors.append(name.text.strip())

            pdf_url = f"https://arxiv.org/pdf/{paper_id}.pdf"

            papers.append({
                "source": "ArXiv",
                "id": paper_id,
                "title": clean_title,
                "authors": authors,
                "year": pub_date[:4] if pub_date != "N/A" else "2024",
                "published": pub_date,
                "abstract": clean_summary,
                "url": f"https://arxiv.org/abs/{paper_id}",
                "pdf_url": pdf_url
            })
    except Exception as e:
        print(f"[AcademicResearcher] ArXiv query error: {e}")

    return papers

async def search_semantic_scholar(query: str, limit: int = 3) -> List[Dict[str, Any]]:
    """Fallback query to Semantic Scholar Open Graph API."""
    params = {
        "query": query,
        "limit": limit,
        "fields": "title,authors,year,abstract,citationCount,openAccessPdf,url"
    }
    papers = []
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(SEMANTIC_SCHOLAR_URL, params=params)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("data", []):
                    authors = [a.get("name") for a in item.get("authors", []) if a.get("name")]
                    open_pdf = item.get("openAccessPdf", {}) or {}
                    papers.append({
                        "source": "SemanticScholar",
                        "id": item.get("paperId", "N/A")[:10],
                        "title": item.get("title", "Untitled"),
                        "authors": authors,
                        "year": str(item.get("year", "2024")),
                        "published": str(item.get("year", "2024")),
                        "abstract": item.get("abstract") or "No abstract provided.",
                        "url": item.get("url") or "",
                        "pdf_url": open_pdf.get("url", ""),
                        "citations": item.get("citationCount", 0)
                    })
    except Exception as e:
        print(f"[AcademicResearcher] Semantic Scholar error: {e}")
    return papers

# ---------------------------------------------------------------------------
# 2. CitationAgent: Generate BibTeX & LaTeX Citations
# ---------------------------------------------------------------------------

def generate_bibtex(paper: Dict[str, Any]) -> str:
    """Generates standard BibTeX entry and cite key."""
    first_author = "Unknown"
    if paper.get("authors"):
        first_author = re.sub(r'[^a-zA-Z]', '', paper["authors"][0].split()[-1].lower())
    year = paper.get("year", "2024")
    
    # Generate clean citekey (e.g., tei2024selfadaptive)
    title_words = re.findall(r'[a-zA-Z]+', paper.get("title", "paper"))
    keyword = title_words[0].lower() if title_words else "sys"
    citekey = f"{first_author}{year}{keyword}"
    
    authors_list = paper.get("authors", ["Unknown"])
    if len(authors_list) > 5:
        author_str = " and ".join(authors_list[:5]) + " and others"
    else:
        author_str = " and ".join(authors_list)
    
    bibtex = (
        f"@article{{{citekey},\n"
        f"  title     = {{{paper.get('title')}}},\n"
        f"  author    = {{{author_str}}},\n"
        f"  year      = {{{year}}},\n"
        f"  journal   = {{{paper.get('source', 'arXiv preprint')}}},\n"
        f"  eprint    = {{{paper.get('id', '')}}},\n"
        f"  url       = {{{paper.get('url', '')}}}\n"
        f"}}"
    )
    return bibtex

# ---------------------------------------------------------------------------
# 3. SynthesisAgent: Generate Structured Monochromatic Research Brief PDF
# ---------------------------------------------------------------------------

def generate_research_brief_pdf(paper: Dict[str, Any]) -> str:
    """Compiles an executive academic research brief with honest provenance and escaped metadata."""
    raw_title = paper.get("title", "Research_Paper")
    clean_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', raw_title)
    clean_title = re.sub(r'_+', '_', clean_title).strip('_')[:35]
    if not clean_title:
        clean_title = "Research_Paper"
    unique_suffix = f"{int(time.time())}_{uuid.uuid4().hex[:6]}"
    filename = f"{clean_title}_{unique_suffix}_Brief.pdf"
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

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName=FONT_HEADING,
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#0a0c10'),
        spaceAfter=6
    )

    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontName=FONT_BODY,
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#555a64'),
        spaceAfter=12
    )

    section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName=FONT_HEADING,
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#16181d'),
        spaceBefore=10,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName=FONT_BODY,
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor('#22262e'),
        spaceAfter=8
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName=FONT_CODE,
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#111317')
    )

    elements = []

    # Header Badge with real timezone
    now_str = datetime.now().astimezone().strftime('%Y-%m-%d %H:%M %Z')
    badge_data = [[
        Paragraph("<font color='#666666'><b>YOMI OS</b> // ACADEMIC RESEARCH BRIEF</font>", styles['Normal']),
        Paragraph(f"<font color='#666666'>{now_str}</font>", styles['Normal'])
    ]]
    badge_table = Table(badge_data, colWidths=[360, 160])
    badge_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(badge_table)
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#000000'), spaceBefore=2, spaceAfter=10))

    # Paper Title (properly HTML-escaped)
    raw_title = paper.get("title", "Academic Literature Synthesis")
    elements.append(Paragraph(html.escape(raw_title), title_style))
    
    # Metadata
    authors_list = paper.get("authors", [])
    if len(authors_list) > 6:
        authors_str = ", ".join(authors_list[:6]) + " et al."
    elif authors_list:
        authors_str = ", ".join(authors_list)
    else:
        authors_str = "Unknown"

    meta_text = (
        f"<b>Authors:</b> {html.escape(authors_str)} &nbsp;|&nbsp; "
        f"<b>Published:</b> {html.escape(str(paper.get('published', 'N/A')))} &nbsp;|&nbsp; "
        f"<b>Source:</b> {html.escape(str(paper.get('source', 'arXiv')))} ({html.escape(str(paper.get('id', 'N/A')))})"
    )
    elements.append(Paragraph(meta_text, meta_style))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cccccc'), spaceBefore=0, spaceAfter=10))

    # Abstract Section
    elements.append(Paragraph("1. EXTRACTED ABSTRACT & REPOSITORY METADATA", section_header))
    abstract_text = paper.get("abstract", "No abstract available.")[:2200]
    elements.append(Paragraph(html.escape(abstract_text), body_style))
    elements.append(Spacer(1, 6))

    # Honest Provenance & Scope Notice
    elements.append(Paragraph("2. PROVENANCE & SYNTHESIS SCOPE", section_header))
    scope_points = [
        f"<b>Repository Link:</b> {html.escape(str(paper.get('url', 'N/A')))}",
        f"<b>PDF Download Target:</b> {html.escape(str(paper.get('pdf_url', 'N/A')))}",
        "<b>Analysis Boundary:</b> This brief captures published repository abstract and citation metadata. Full-text deep synthesis and experimental reproduction require document ingestion via local PDF reader or configured model worker."
    ]
    for pt in scope_points:
        elements.append(Paragraph(f"• {pt}", body_style))
    elements.append(Spacer(1, 6))

    # BibTeX Citation
    elements.append(Paragraph("3. BIBTEX CITATION ENTRY", section_header))
    bibtex_str = generate_bibtex(paper)
    bibtex_escaped = html.escape(bibtex_str).replace('\n', '<br/>').replace(' ', '&nbsp;')
    bibtex_p = Paragraph(bibtex_escaped, code_style)
    bibtex_table = Table([[bibtex_p]], colWidths=[520])
    bibtex_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f5f6f8')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#d0d4dc')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(bibtex_table)
    elements.append(Spacer(1, 14))

    # Footer
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cccccc'), spaceBefore=8, spaceAfter=6))
    footer_text = f"<font color='#888888'>Source: {html.escape(str(paper.get('source', 'arXiv')))} | Verified Reference Brief</font>"
    elements.append(Paragraph(footer_text, meta_style))

    doc.build(elements)
    return filename

# ---------------------------------------------------------------------------
# 4. Orchestration Function: Execute Academic Research Workflow
# ---------------------------------------------------------------------------

async def conduct_academic_research(topic: str) -> Dict[str, Any]:
    """Full pipeline: Search papers, extract top hit, generate PDF brief and BibTeX."""
    # 1. Search ArXiv
    papers = await search_arxiv(topic, max_results=3)
    if not papers:
        # Fallback to Semantic Scholar
        papers = await search_semantic_scholar(topic, limit=3)

    if not papers:
        return {
            "success": False,
            "message": f"Could not locate academic literature matching query: '{topic}' on ArXiv or Semantic Scholar."
        }

    top_paper = papers[0]
    bibtex = generate_bibtex(top_paper)
    pdf_filename = generate_research_brief_pdf(top_paper)
    pdf_download_url = f"http://127.0.0.1:8765/exports/{pdf_filename}"

    return {
        "success": True,
        "filename": pdf_filename,
        "pdf_filename": pdf_filename,
        "paper": top_paper,
        "all_papers": papers,
        "bibtex": bibtex,
        "pdf_download_url": pdf_download_url,
        "summary": (
            f"**{top_paper['title']}** ({top_paper['year']}) by {', '.join(top_paper['authors'][:3])}.\n\n"
            f"{top_paper['abstract'][:350]}...\n\n"
            f"📄 **Research Brief PDF:** [{pdf_filename}]({pdf_download_url})"
        )
    }
