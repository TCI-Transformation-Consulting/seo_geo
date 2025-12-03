from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional, Tuple, Set
from urllib.parse import urlparse, urljoin
import httpx
from bs4 import BeautifulSoup
import html2text

# Try to import crawl4ai, but don't fail if browser is not available
try:
    from crawl4ai import AsyncWebCrawler
    CRAWL4AI_AVAILABLE = True
except Exception:
    CRAWL4AI_AVAILABLE = False
    AsyncWebCrawler = None

class Crawl4AINotConfigured(RuntimeError):
    pass


async def _http_scrape(url: str) -> Tuple[str, Dict[str, Any]]:
    """
    Simple HTTP-based scraping fallback that doesn't require a browser.
    """
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0, headers=headers) as client:
            r = await client.get(url)
            if r.status_code != 200:
                return "", {"url": url, "ok": False, "error": f"HTTP {r.status_code}"}
            
            soup = BeautifulSoup(r.text, "html.parser")
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "header", "footer"]):
                script.decompose()
            
            # Get title and description
            title = soup.title.string.strip() if soup.title and soup.title.string else ""
            meta_desc = soup.find("meta", attrs={"name": "description"})
            description = meta_desc.get("content", "").strip() if meta_desc else ""
            
            # Convert to markdown-like text
            h = html2text.HTML2Text()
            h.ignore_links = False
            h.ignore_images = True
            h.body_width = 0
            md = h.handle(r.text)
            
            # Fallback to plain text if html2text fails
            if not md or len(md.strip()) < 50:
                md = soup.get_text(" ", strip=True)
            
            return md, {
                "url": url,
                "ok": True,
                "via": "httpx",
                "length": len(md),
                "title": title,
                "description": description,
            }
    except Exception as e:
        return "", {"url": url, "ok": False, "error": str(e)}


async def scrape_markdown(url: str) -> Tuple[str, Dict[str, Any]]:
    """
    Scrape a single URL and return markdown + metadata.
    Uses HTTP fallback if crawl4ai browser is not available.
    """
    # Always try HTTP method first as it's more reliable
    md, meta = await _http_scrape(url)
    if md and len(md.strip()) > 100:
        return md, meta
    
    # Try crawl4ai as fallback for JavaScript-heavy sites
    if CRAWL4AI_AVAILABLE and AsyncWebCrawler:
        try:
            async with AsyncWebCrawler() as crawler:
                result = await crawler.arun(url=url)
                
                if result.success and result.markdown:
                    return result.markdown, {
                        "url": url,
                        "ok": True,
                        "via": "crawl4ai",
                        "length": len(result.markdown),
                        "title": result.metadata.get("title") if result.metadata else None,
                        "description": result.metadata.get("description") if result.metadata else None,
                    }
        except Exception:
            pass  # Fall through to return HTTP result
    
    return md, meta


async def crawl_markdown(url: str, limit: int = 10) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Crawl a site (same domain) up to 'limit' pages and return markdown for each.
    """
    start_url = url
    if not start_url.startswith(("http://", "https://")):
        start_url = "https://" + start_url
    
    parsed = urlparse(start_url)
    root_domain = parsed.netloc or parsed.path

    pages: List[Dict[str, Any]] = []
    visited: Set[str] = set()
    queue: List[str] = [start_url]
    
    # We will use a single crawler instance for the session if possible, 
    # but for simplicity/robustness in this initial implementation, let's just 
    # process the queue. Ideally, we should use a BFS strategy.
    
    # Crawl4AI doesn't have a built-in "crawl entire site" method that returns all markdowns easily 
    # (it has advanced strategies, but let's stick to a manual BFS control for now to match 
    # previous behavior and ensure we stay within limits).

    async with AsyncWebCrawler() as crawler:
        while queue and len(pages) < limit:
            current_url = queue.pop(0)
            if current_url in visited:
                continue
            visited.add(current_url)

            try:
                result = await crawler.arun(url=current_url)
                
                if result.success:
                    md = result.markdown or ""
                    pages.append({
                        "markdown": md,
                        "url": current_url,
                        "title": result.metadata.get("title"),
                    })

                    # extract links
                    # result.links is a dict or list of internal/external links?
                    # Check docs: result.links usually contains {"internal": [], "external": []} or similar
                    # If not available directly, we might need to parse HTML or use result.html
                    
                    # Assuming result.links is available and structured. 
                    # If result.links is a dictionary:
                    internal_links = result.links.get("internal", []) if isinstance(result.links, dict) else []
                    
                    # If result.links is just a list of strings (older versions) or list of objects
                    if not internal_links and isinstance(result.links, list):
                        # Simple heuristic filtering
                        for l in result.links:
                            if isinstance(l, str) and (root_domain in l):
                                internal_links.append(l)
                            elif isinstance(l, dict) and "href" in l:
                                href = l["href"]
                                if root_domain in href:
                                    internal_links.append(href)

                    for link in internal_links:
                        # Normalize logic
                        # link might be relative or absolute
                        if isinstance(link, dict):
                             link_href = link.get("href")
                        else:
                             link_href = link
                        
                        if not link_href: 
                             continue
                             
                        full_link = urljoin(current_url, link_href)
                        
                        # Verify domain scope
                        p = urlparse(full_link)
                        if (p.netloc or p.path).endswith(root_domain):
                            if full_link not in visited and full_link not in queue:
                                queue.append(full_link)

            except Exception as e:
                # Log error or skip
                pass
                
    meta = {
        "seed": start_url,
        "count": len(pages),
        "ok": True,
        "via": "crawl4ai"
    }
    return pages, meta
