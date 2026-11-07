import sys
from pathlib import Path
import os
import pypdfium2 as pdfium

YOMI_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(YOMI_DIR))
sys.path.insert(0, str(YOMI_DIR / "backend"))
from config import EXPORTS_DIR

from backend.tools.academic_researcher import generate_research_brief_pdf

def test_unicode_pdf_generation():
    test_paper = {
        'title': '分散エッジ推論: Byzantine Resilient Consensus in Asynchronous Mobile Edge Architectures & Analysis of <α, β, γ> Parameters',
        'authors': ['A. Author', '山田 太郎', 'B. Author'],
        'year': '2026',
        'published': '2026-11-07',
        'source': 'arXiv',
        'id': '2410.18942v1',
        'abstract': '本論文では、非同期エッジ環境におけるビザンチン耐性合意プロトコルを提案する。We evaluate latency bounds under packet loss: Pr(X >= λ) <= exp(-k*μ). Special characters: <>&" and long URL: https://arxiv.org/abs/2410.18942v1?ref=test&param=1#sec.',
        'url': 'https://arxiv.org/abs/2410.18942v1',
        'pdf_url': 'https://arxiv.org/pdf/2410.18942v1.pdf'
    }

    fname = generate_research_brief_pdf(test_paper)
    print('Generated filename:', fname)
    pdf_path = EXPORTS_DIR / fname
    assert pdf_path.exists(), f"PDF not found at {pdf_path}"

    doc = pdfium.PdfDocument(str(pdf_path))
    print('Page count:', len(doc))
    assert len(doc) >= 1

    out_img = YOMI_DIR / "tests" / "test_japanese_brief_page1.png"
    img = doc[0].render(scale=2).to_pil()
    img.save(str(out_img))
    print(f"Rendered image saved to: {out_img} (Size: {out_img.stat().st_size} bytes)")
    return True

if __name__ == "__main__":
    test_unicode_pdf_generation()

