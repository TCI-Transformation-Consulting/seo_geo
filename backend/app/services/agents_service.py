from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from .crawl4ai_service import scrape_markdown, Crawl4AINotConfigured
from .gemini_service import GeminiNotConfigured


async def run_agent(goal: str, urls: Optional[List[str]] = None, constraints: Optional[Any] = None) -> Dict[str, Any]:
    """
    Minimal agent runner that can call a single tool: crawl4ai_scrape.
    - Respects an optional allowlist of domains and a max_calls limit from constraints.
    - Scrapes provided URLs (or the domains permitted) and returns an audit trail.

    Returns a dict compatible with AgentRunResponse:
    {
      "steps": [
        {"tool": "crawl4ai_scrape", "args": {"url": "..."}, "output_summary": "..."},
        ...
      ],
      "summary": "..."
    }
    """
    urls = urls or []
    steps: List[Dict[str, Any]] = []

    # Extract constraints (keep loose typing for resilience)
    allowlist: Optional[List[str]] = None
    max_calls: int = 3
    if constraints:
        try:
            # Pydantic model case
            allowlist = getattr(constraints, "allowlist", None)
            max_calls = getattr(constraints, "max_calls", 3) or 3
        except Exception:
            pass
        if not allowlist and isinstance(constraints, dict):
            allowlist = constraints.get("allowlist")
            max_calls = constraints.get("max_calls", 3) or 3

    def allowed(u: str) -> bool:
        if not allowlist:
            return True
        host = urlparse(u).netloc
        return any(host.endswith(dom) or host == dom for dom in allowlist)

    calls = 0
    for u in urls:
        if calls >= max_calls:
            break
        if not allowed(u):
            continue
        try:
            md, _ = await scrape_markdown(u)
            summary = md[:400].replace("\n", " ").strip() if md else "(no markdown extracted)"
            steps.append(
                {
                    "tool": "crawl4ai_scrape",
                    "args": {"url": u},
                    "output_summary": summary,
                }
            )
            calls += 1
        except (Crawl4AINotConfigured, GeminiNotConfigured) as e:
            steps.append({"tool": "crawl4ai_scrape", "args": {"url": u}, "output_summary": f"ERROR: {e}"})
            calls += 1
        except Exception as e:
            steps.append({"tool": "crawl4ai_scrape", "args": {"url": u}, "output_summary": f"ERROR: {e}"})
            calls += 1

    if not steps:
        steps.append(
            {
                "tool": "crawl4ai_scrape",
                "args": {"url": urls[0] if urls else "(none)"},
                "output_summary": "No steps executed (no allowed URLs or empty input).",
            }
        )

    summary = f"Goal: {goal}. Executed {len(steps)} step(s) with max_calls={max_calls}."
    return {"steps": steps, "summary": summary}
