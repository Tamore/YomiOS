import httpx
from bs4 import BeautifulSoup
import urllib.parse
import os
import sys
from pathlib import Path
from typing import Dict, Any, List

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
from config import safe_http_get, validate_safe_url

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
}

async def live_web_search(query: str, max_results: int = 5) -> Dict[str, Any]:
    """
    Performs sovereign, zero-key live web search via DuckDuckGo HTML endpoint.
    Extracts organic titles, clean snippets, and target destination URLs.
    """
    url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
    try:
        async with httpx.AsyncClient(timeout=12.0, headers=HEADERS, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return {
                    "success": False,
                    "query": query,
                    "error": f"Search engine responded with HTTP {resp.status_code}",
                    "results": []
                }

            soup = BeautifulSoup(resp.text, "html.parser")
            results = []
            
            # Find result items
            result_divs = soup.find_all("div", class_="result")
            for div in result_divs[:max_results]:
                title_tag = div.find("a", class_="result__a")
                snippet_tag = div.find("a", class_="result__snippet")
                if not title_tag:
                    continue
                
                raw_href = title_tag.get("href", "")
                # Clean DuckDuckGo redirect url e.g. //duckduckgo.com/l/?uddg=...
                target_url = raw_href
                if "uddg=" in raw_href:
                    parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_href).query)
                    target_url = parsed.get("uddg", [raw_href])[0]
                
                title = title_tag.get_text(strip=True)
                snippet = snippet_tag.get_text(strip=True) if snippet_tag else ""
                
                if title and target_url.startswith("http"):
                    results.append({
                        "title": title,
                        "url": target_url,
                        "snippet": snippet
                    })

            return {
                "success": True,
                "query": query,
                "count": len(results),
                "results": results
            }
    except Exception as e:
        return {
            "success": False,
            "query": query,
            "error": str(e),
            "results": []
        }

async def scrape_webpage_markdown(url: str) -> Dict[str, Any]:
    """
    Fetches any public webpage, validates against SSRF on initial request and every redirect hop,
    strips scripts/ads/styles, and extracts clean readable text/markdown structured with headers.
    """
    try:
        resp = await safe_http_get(url, timeout=15.0, headers=HEADERS)
        if resp.status_code != 200:
            return {"success": False, "error": f"HTTP {resp.status_code}"}

        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "iframe", "noscript", "svg"]):
            tag.decompose()

        title = soup.title.string.strip() if soup.title and soup.title.string else "Web Intelligence Report"
        
        # Extract main article or body
        main_node = soup.find("main") or soup.find("article") or soup.body or soup
        text = main_node.get_text(separator="\n", strip=True)
        
        # Condense consecutive blank lines
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        cleaned_body = "\n".join(lines[:150]) # First 150 meaningful lines

        return {
            "success": True,
            "url": url,
            "title": title,
            "content_preview": cleaned_body[:2500],
            "total_lines": len(lines)
        }
    except Exception as e:
        return {"success": False, "url": url, "error": str(e)}

