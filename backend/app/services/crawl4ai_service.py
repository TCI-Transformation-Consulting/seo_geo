from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional, Tuple, Set
from urllib.parse import urlparse, urljoin

from crawl4ai import AsyncWebCrawler
# If crawl4ai doesn't export BrowserConfig or CrawlerRunConfig directly in top-level,
# check their docs or assume defaults. The docs say:
# async with AsyncWebCrawler() as crawler: ...
# result = await crawler.arun(url="...")

class Crawl4AINotConfigured(RuntimeError):
    pass


async def scrape_markdown(url: str) -> Tuple[str, Dict[str, Any]]:
    """
    Scrape a single URL using Crawl4AI and return markdown + metadata.
    """
    try:
        async with AsyncWebCrawler() as crawler:
            result = await crawler.arun(url=url)
            
            if not result.success:
                return "", {"url": url, "ok": False, "error": result.error_message or "Unknown error"}

            md = result.markdown or ""
            # Fallback if markdown is empty but html exists? Crawl4AI usually handles this.
            
            return md, {
                "url": url,
                "ok": True,
                "via": "crawl4ai",
                "length": len(md),
                "title": result.metadata.get("title"),
                "description": result.metadata.get("description"),
            }
    except Exception as e:
        return "", {"url": url, "ok": False, "error": str(e)}


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
