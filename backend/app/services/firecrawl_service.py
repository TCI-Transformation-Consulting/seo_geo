from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple, Set, Callable, Coroutine
from urllib.parse import urlparse, urljoin
import asyncio

import httpx
from bs4 import BeautifulSoup

# Optional Crawl4AI integration
try:
    from crawl4ai import AsyncWebCrawler  # type: ignore
    HAS_CRAWL4AI = True
except Exception:
    AsyncWebCrawler = None  # type: ignore
    HAS_CRAWL4AI = False


# Keep the same exception name for compatibility with existing endpoints
class FirecrawlNotConfigured(RuntimeError):
    pass


# Reuse UA policy
try:
    from .crawler_service import DEFAULT_USER_AGENT  # type: ignore
except Exception:
    DEFAULT_USER_AGENT = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )


def _run_in_new_loop(coro_factory: Callable[[], Coroutine[Any, Any, Any]]) -> Any:
    """
    Run the given coroutine factory in a fresh event loop to avoid 'already running loop' errors
    when called from FastAPI async endpoints.
    """
    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(coro_factory())
    finally:
        try:
            loop.run_until_complete(asyncio.sleep(0))
        except Exception:
            pass
        loop.close()


def _fetch_html_sync(url: str, timeout_s: float = 15.0) -> str:
    timeout = httpx.Timeout(timeout_s, connect=5.0)
    headers = {"User-Agent": DEFAULT_USER_AGENT}
    with httpx.Client(headers=headers, follow_redirects=True, timeout=timeout) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.text


def _text_content(node: BeautifulSoup) -> str:
    txt = node.get_text(" ", strip=True)
    return " ".join(txt.split())


def _html_to_markdown(soup: BeautifulSoup) -> str:
    parts: List[str] = []
    if soup.title and soup.title.string:
        parts.append(f"# {soup.title.string.strip()}")
    for tag in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li"]):
        name = tag.name or ""
        txt = _text_content(tag)
        if not txt:
            continue
        if name == "h1":
            parts.append(f"# {txt}")
        elif name == "h2":
            parts.append(f"## {txt}")
        elif name == "h3":
            parts.append(f"### {txt}")
        elif name == "h4":
            parts.append(f"#### {txt}")
        elif name == "h5":
            parts.append(f"##### {txt}")
        elif name == "h6":
            parts.append(f"###### {txt}")
        else:
            parts.append(txt)
    return "\n\n".join(parts).strip()


async def _crawl4ai_fetch_markdown(url: str) -> str:
    """
    Use Crawl4AI to fetch a single page and return clean markdown.
    """
    assert AsyncWebCrawler is not None
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url=url)
        md = getattr(result, "markdown", "") or getattr(result, "content_markdown", "") or ""
        return md.strip()


def scrape_markdown(url: str) -> Tuple[str, Dict[str, Any]]:
    """
    Single page scrape -> returns (markdown, raw_info).
    Prefers Crawl4AI if available; falls back to httpx+BeautifulSoup.
    """
    try:
        if HAS_CRAWL4AI:
            md: str = _run_in_new_loop(lambda: _crawl4ai_fetch_markdown(url))
            if not md:
                # Fallback to raw HTML extraction
                html = _fetch_html_sync(url)
                soup = BeautifulSoup(html, "html.parser")
                md = _html_to_markdown(soup)
            return md, {"url": url, "ok": True, "via": "crawl4ai", "length": len(md)}
        # Fallback path
        html = _fetch_html_sync(url)
        soup = BeautifulSoup(html, "html.parser")
        md = _html_to_markdown(soup)
        return md, {"url": url, "ok": True, "via": "httpx+bs4", "length": len(md)}
    except Exception as e:
        # Surface errors to callers
        return "", {"url": url, "ok": False, "error": str(e)}


def _same_host(u: str, host: str) -> bool:
    try:
        p = urlparse(u)
        return (p.netloc or p.path).endswith(host)
    except Exception:
        return False


def _normalize_url(base: str, link: str) -> Optional[str]:
    try:
        href = urljoin(base, link)
        p = urlparse(href)
        if p.scheme not in ("http", "https"):
            return None
        if p.fragment:
            href = href.split("#", 1)[0]
        return href
    except Exception:
        return None


def crawl_markdown(url: str, limit: int = 10) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Site crawl (same-host BFS). Returns (pages, meta).
    For each page: {'markdown': str, 'url': str}
    Prefers Crawl4AI page fetch; falls back to httpx+BeautifulSoup.
    """
    start = url
    if not start.startswith(("http://", "https://")):
        start = "https://" + start
    parsed = urlparse(start)
    root_host = parsed.netloc or parsed.path

    visited: Set[str] = set()
    queue: List[str] = [start]
    pages: List[Dict[str, Any]] = []

    headers = {"User-Agent": DEFAULT_USER_AGENT}
    timeout = httpx.Timeout(12.0, connect=5.0)

    with httpx.Client(headers=headers, follow_redirects=True, timeout=timeout) as client:
        while queue and len(pages) < limit:
            current = queue.pop(0)
            if current in visited:
                continue
            visited.add(current)

            try:
                # First use HTTP to discover links quickly
                resp = client.get(current)
                if resp.status_code >= 400 or not resp.text:
                    continue
                html = resp.text
                soup = BeautifulSoup(html, "html.parser")

                # Get markdown via Crawl4AI if available; otherwise from soup
                if HAS_CRAWL4AI:
                    try:
                        md: str = _run_in_new_loop(lambda: _crawl4ai_fetch_markdown(current))
                    except Exception:
                        md = _html_to_markdown(soup)
                else:
                    md = _html_to_markdown(soup)

                if md:
                    pages.append({"markdown": md, "url": current})

                # Discover same-host URLs
                for a in soup.find_all("a", href=True):
                    nxt = _normalize_url(current, a.get("href") or "")
                    if not nxt:
                        continue
                    if not _same_host(nxt, root_host):
                        continue
                    if nxt in visited or nxt in queue:
                        continue
                    if len(queue) + len(pages) >= max(limit * 3, limit + 5):
                        # keep queue from exploding
                        continue
                    queue.append(nxt)

            except Exception:
                # Skip problematic pages
                continue

    meta: Dict[str, Any] = {
        "seed": start,
        "pages": [p.get("url") for p in pages if isinstance(p, dict)],
        "count": len(pages),
        "ok": True,
        "via": "crawl4ai" if HAS_CRAWL4AI else "httpx+bs4",
    }
    return pages, meta
