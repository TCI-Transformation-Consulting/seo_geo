from __future__ import annotations

import uuid
from datetime import datetime
from typing import Dict, Any
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup


DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


async def fetch_html(url: str) -> str:
    """Fetch HTML content for a given URL with sensible defaults."""
    timeout = httpx.Timeout(15.0, connect=5.0)
    async with httpx.AsyncClient(
        headers={"User-Agent": DEFAULT_USER_AGENT},
        follow_redirects=True,
        timeout=timeout,
    ) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.text


def extract_domain(url: str) -> str:
    parsed = urlparse(url)
    return parsed.netloc or url


def compute_audit_scores(soup: BeautifulSoup, full_html: str) -> Dict[str, float]:
    """Very lightweight heuristics to provide initial audit scores."""
    # Structure: presence of semantic sections
    structure_elements = ["header", "nav", "main", "article", "section", "aside", "footer"]
    present = sum(1 for tag in structure_elements if soup.find(tag) is not None)
    structure_score = min(100, 40 + present * 10)  # 40 base + 10 per element found

    # Structured data: JSON-LD scripts
    jsonld = soup.find_all("script", attrs={"type": "application/ld+json"})
    structured_data_score = 85 if jsonld else 35

    # Content: title + meta description + H1
    title = (soup.title.string or "").strip() if soup.title else ""
    meta_desc_tag = soup.find("meta", attrs={"name": "description"})
    meta_desc = meta_desc_tag.get("content").strip() if meta_desc_tag and meta_desc_tag.get("content") else ""
    has_h1 = soup.find("h1") is not None
    content_score = 30
    if title:
        content_score += 30
    if meta_desc and len(meta_desc) >= 50:
        content_score += 25
    if has_h1:
        content_score += 15
    content_score = min(100, content_score)

    # API: placeholder (detect any link/script hinting to API)
    api_indicators = soup.find_all(["link", "script"], href=True) + soup.find_all(["link", "script"], src=True)
    api_score = 20 if not api_indicators else 40

    # Robots: meta robots present or not
    robots_meta = soup.find("meta", attrs={"name": "robots"})
    robots_score = 80 if robots_meta else 50

    # Feeds: RSS/Atom discovery
    feeds = soup.find_all("link", attrs={"rel": "alternate"})
    has_feed = any(
        (link.get("type") in {"application/rss+xml", "application/atom+xml"}) for link in feeds
    )
    feeds_score = 80 if has_feed else 20

    # MCP / Monitoring: placeholder baseline
    mcp_score = 0.0
    monitoring_score = 50.0

    return {
        "structure": float(structure_score),
        "structured_data": float(structured_data_score),
        "content": float(content_score),
        "api": float(api_score),
        "robots": float(robots_score),
        "feeds": float(feeds_score),
        "mcp": float(mcp_score),
        "monitoring": float(monitoring_score),
    }


def derive_overall_status(score: float) -> str:
    if score >= 80:
        return "healthy"
    if score >= 50:
        return "warning"
    return "critical"


async def scan_site(url: str) -> Dict[str, Any]:
    """
    Fetch and parse a single URL, returning a payload aligned to frontend's ClientProject shape.
    """
    html = await fetch_html(url)
    soup = BeautifulSoup(html, "html.parser")

    domain = extract_domain(url)
    title = (soup.title.string or "").strip() if soup.title and soup.title.string else domain

    audit_scores = compute_audit_scores(soup, html)

    # Overall score: average of key dimensions (structure, structured_data, content)
    key_dims = ["structure", "structured_data", "content"]
    score = int(sum(audit_scores[d] for d in key_dims) / len(key_dims))

    # Simple issue count heuristic
    issues = 0
    if audit_scores.get("structured_data", 0) < 50:
        issues += 1
    if audit_scores.get("content", 0) < 60:
        issues += 1
    if audit_scores.get("structure", 0) < 60:
        issues += 1

    project: Dict[str, Any] = {
        "id": f"scan-{uuid.uuid4()}",
        "name": title[:80] if title else domain,
        "domain": domain or "unknown",
        "score": score,
        "lastScan": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "pagesScanned": 1,
        "clusters": 1,
        "issues": issues,
        "status": derive_overall_status(score),
        "trend": [max(0, min(100, score - 10)), max(0, min(100, score - 5)), score],
        "auditScores": audit_scores,
        # Return a trimmed snippet to keep payload reasonable
        "htmlSnippet": html[:50000],
    }
    return project
