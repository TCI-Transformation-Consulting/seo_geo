from fastapi import APIRouter, HTTPException
from urllib.parse import urlparse, quote_plus
from ..models.schemas import (
    ScanRequest,
    ClientProject,
    HealthResponse,
    ContentChunksRequest,
    ContentChunksResponse,
    QuestionsRequest,
    QuestionsResponse,
    ReviewRequest,
    ReviewResponse,
    SemanticCoverageRequest,
    SemanticCoverageResponse,
    NAPAuditRequest,
    NAPAuditResponse,
    FactCheckRequest,
    FactCheckResponse,
    HallucinationDetectRequest,
    HallucinationDetectResponse,
    AgentRunRequest,
    AgentRunResponse,
    JSONLDGenerateRequest,
    JSONLDGenerateResponse,
    OpenAPIGenerateRequest,
    OpenAPIGenerateResponse,
    RSSGenerateRequest,
    RSSGenerateResponse,
    RobotsGenerateRequest,
    RobotsGenerateResponse,
    SitemapGenerateRequest,
    SitemapGenerateResponse,
    MCPConfigGenerateRequest,
    MCPConfigGenerateResponse,
    AIManifestGenerateRequest,
    AIManifestGenerateResponse,
    LlmsTxtGenerateRequest,
    LlmsTxtGenerateResponse,
    CompetitorSearchRequest,
    CompetitorSearchResponse,
    GroundedAnalysisRequest,
    GroundedAnalysisResponse,
    URLListRequest,
    URLListResponse,
    AIVisibilityRequest,
    AIVisibilityResponse,
)
from ..services.crawler_service import scan_site, fetch_html, compute_audit_scores, DEFAULT_USER_AGENT
from ..services.crawl4ai_service import scrape_markdown, crawl_markdown, Crawl4AINotConfigured
from ..services.gemini_service import (
    generate_content_chunks,
    GeminiNotConfigured,
    extract_questions,
    generate_review_reply,
    semantic_coverage_analysis,
    extract_nap_json,
    fact_check_claim,
    generate_jsonld,
    search_competitors_grounded,
    grounded_competitor_analysis,
    analyze_ai_visibility,
    analyze_page_comprehensive,
    validate_extracted_data,
    generate_user_questions,
    ai_visibility_ungrounded,
    ai_visibility_grounded,
    calculate_ai_visibility_score,
)
from ..services.generation_service import (
    generate_openapi_from_markdown,
    generate_rss_from_markdown,
    generate_robots_from_markdown,
    generate_sitemap_from_markdown,
    generate_mcp_config_from_markdown,
    generate_ai_manifest_from_markdown,
    generate_llms_txt_from_markdown,
)
from ..services.monitoring_service import detect_hallucinations
from ..services.agents_service import run_agent
from datetime import datetime
import httpx
from bs4 import BeautifulSoup
import json
from typing import Any
import re
from collections import Counter

router = APIRouter(prefix="/api", tags=["api"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse()


@router.get("/debug/gemini")
async def debug_gemini():
    """
    Temporary diagnostics: verifies GEMINI_API_KEY presence and a minimal generate_content call.
    """
    import os
    try:
        from google import genai  # type: ignore
    except Exception as e:
        return {"has_key": bool(os.getenv("GEMINI_API_KEY")), "ok": False, "error": f"import_error: {e}"}

    key = os.getenv("GEMINI_API_KEY")
    has_key = bool(key)
    try:
        client = genai.Client(api_key=key)
        resp = client.models.generate_content(
            model="gemini-2.0-flash",
            contents="ping",
            config={
                "system_instruction": "You are a bot.",
                "response_mime_type": "text/plain",
            },
        )
        ok = bool(getattr(resp, "text", ""))
        return {"has_key": has_key, "ok": ok, "text": (getattr(resp, "text", "") or "")[:100]}
    except Exception as e:
        return {"has_key": has_key, "ok": False, "error": str(e)}


@router.post("/debug/review-client")
async def debug_review_client():
    """
    Diagnostics: validate review reply path (Gemini client + plain text generation).
    """
    import os
    try:
        from google import genai  # type: ignore
    except Exception as e:
        return {"has_key": bool(os.getenv("GEMINI_API_KEY")), "ok": False, "error": f"import_error: {e}"}
    key = os.getenv("GEMINI_API_KEY")
    try:
        client = genai.Client(api_key=key)
        resp = client.models.generate_content(
            model="gemini-2.0-flash",
            contents="Generate a short, friendly reply in German to: 'Tolles Team, aber die Reaktionszeit war etwas lang.'",
            config={
                "system_instruction": "Du bist ein freundlicher Support-Agent. Antworte knapp, empathisch, lösungsorientiert. Nur Text.",
                "response_mime_type": "text/plain",
            },
        )
        return {"ok": True, "text": (getattr(resp, "text", "") or "")[:200]}
    except Exception as e:
        return {"has_key": bool(key), "ok": False, "error": str(e)}


@router.post("/debug/hallu-stack")
async def debug_hallu_stack(url: str):
    """
    Diagnostics: validate hallucination pipeline (scrape + detection).
    """
    try:
        md, _ = await scrape_markdown(url)
        from ..services.monitoring_service import detect_hallucinations  # local import to avoid cycles
        findings = detect_hallucinations("Probe: Firma wurde 1999 gegründet und hat 500 Mitarbeiter.", md)
        return {"scrape_len": len(md), "findings_sample": findings[:2]}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/scan", response_model=ClientProject)
async def scan(req: ScanRequest) -> ClientProject:
    try:
        url_str = str(req.url).strip()
        if not url_str.startswith(("http://", "https://")):
            url_str = "https://" + url_str
        result = await scan_site(url_str)
        return ClientProject(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Scan failed: {e}")


@router.post("/analysis/comprehensive")
async def comprehensive_analysis(req: dict):
    """
    LLM-basierte umfassende Analyse nach dem Prinzip:
    Scrape → LLM Parse → Strukturierte Daten
    
    Diese Analyse nutzt den LLM für das Content-Verständnis statt regelbasiertem Parsing.
    """
    try:
        url = req.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="URL required")
        
        base_url = str(url).rstrip("/")
        parsed = urlparse(base_url)
        hostname = parsed.netloc
        scheme = parsed.scheme or "https"
        
        # Handle www variants
        if hostname.startswith("www."):
            hostname_alt = hostname[4:]
        else:
            hostname_alt = f"www.{hostname}"
        
        bases = [f"{scheme}://{hostname}", f"{scheme}://{hostname_alt}"]
        
        # Important pages to analyze
        page_paths = [
            "",  # Homepage
            "/impressum",
            "/imprint",
            "/kontakt",
            "/contact",
            "/about",
            "/ueber-uns",
        ]
        
        # Collect content from multiple pages
        all_content = []
        scanned_pages = []
        
        for base in bases:
            for path in page_paths:
                if len(scanned_pages) >= 5:
                    break
                page_url = f"{base}{path}"
                try:
                    md, meta = await scrape_markdown(page_url)
                    if md and len(md.strip()) > 200:
                        all_content.append(f"\n\n=== PAGE: {page_url} ===\n\n{md}")
                        scanned_pages.append(page_url)
                except Exception:
                    continue
            if len(scanned_pages) >= 5:
                break
        
        if not all_content:
            raise HTTPException(status_code=400, detail="Could not scrape any content from the URL")
        
        # Combine content for LLM analysis
        combined = "\n".join(all_content)
        if len(combined) > 50000:
            combined = combined[:50000]
        
        # Run comprehensive LLM analysis
        analysis = analyze_page_comprehensive(combined, base_url)
        
        # Optionally validate critical data (NAP)
        if analysis.get("business"):
            validation = validate_extracted_data(
                combined, 
                analysis["business"], 
                "Business/NAP"
            )
            analysis["business"]["_validation"] = validation
        
        # Add metadata
        analysis["_meta"] = {
            "scannedPages": scanned_pages,
            "pagesCount": len(scanned_pages),
            "contentLength": len(combined),
            "analyzedAt": datetime.now().isoformat(),
        }
        
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Comprehensive analysis failed: {e}")


@router.post("/initial-scan")
async def initial_scan(req: ScanRequest):
    """
    Real initial scan:
    - Normalizes URL
    - Fetches HTML (no Firecrawl required)
    - Extracts basic content/technical signals
    - Computes heuristic score using crawler_service.compute_audit_scores
    """
    try:
        url_str = str(req.url)
        if not url_str.startswith(("http://", "https://")):
            url_str = "https://" + url_str

        # Fetch and parse HTML
        html = await fetch_html(url_str)
        soup = BeautifulSoup(html, "html.parser")

        now = datetime.utcnow().isoformat() + "Z"
        parsed = urlparse(url_str)
        hostname = parsed.netloc or url_str

        # Content analysis
        title = (soup.title.string or "").strip() if soup.title and soup.title.string else hostname
        meta_desc_tag = soup.find("meta", attrs={"name": "description"})
        description = (meta_desc_tag.get("content") or "").strip() if meta_desc_tag else ""
        headings = {
            "h1": [h.get_text(strip=True) for h in soup.find_all("h1")],
            "h2": [h.get_text(strip=True) for h in soup.find_all("h2")],
            "h3": [h.get_text(strip=True) for h in soup.find_all("h3")],
        }
        meta_tag_count = len(soup.find_all("meta"))

        # Schema types (JSON-LD)
        schema_types: list[str] = []
        for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
            try:
                data = json.loads(script.string or "null")

                def collect_types(obj) -> list[str]:
                    types: list[str] = []
                    if isinstance(obj, dict):
                        t = obj.get("@type")
                        if isinstance(t, str):
                            types.append(t)
                        elif isinstance(t, list):
                            types += [x for x in t if isinstance(x, str)]
                        for v in obj.values():
                            types += collect_types(v)
                    elif isinstance(obj, list):
                        for it in obj:
                            types += collect_types(it)
                    return types

                schema_types += collect_types(data)
            except Exception:
                continue
        schema_types = list(dict.fromkeys(schema_types))[:20]
        schema_found = bool(schema_types)

        # robots.txt check (lightweight)
        robots_found = False
        robots_ai_optimized = False
        try:
            timeout = httpx.Timeout(5.0)
            async with httpx.AsyncClient(
                timeout=timeout,
                headers={"User-Agent": DEFAULT_USER_AGENT},
                follow_redirects=True,
            ) as client:
                robots_url = f"{parsed.scheme or 'https'}://{hostname}/robots.txt"
                r = await client.get(robots_url)
                if r.status_code == 200:
                    robots_found = True
                    txt = (r.text or "").lower()
                    robots_ai_optimized = any(k in txt for k in ["gptbot", "ai", "microsoft/bi", "anthropic"])
        except Exception:
            pass

        # sitemap check (link rel or common path)
        sitemap_found = False
        sitemap_urls = 0
        try:
            links = soup.find_all("link", attrs={"rel": "sitemap"})
            if links:
                sitemap_found = True
            else:
                timeout = httpx.Timeout(5.0)
                async with httpx.AsyncClient(
                    timeout=timeout,
                    headers={"User-Agent": DEFAULT_USER_AGENT},
                    follow_redirects=True,
                ) as client:
                    sitemap_url = f"{parsed.scheme or 'https'}://{hostname}/sitemap.xml"
                    s = await client.get(sitemap_url)
                    if s.status_code == 200:
                        sitemap_found = True
                        sitemap_urls = s.text.count("<url>") if s.text else 0
        except Exception:
            pass

        # RSS/Atom feed discovery
        rss_found = False
        rss_items = 0
        try:
            alt_links = soup.find_all("link", attrs={"rel": "alternate"})
            for l in alt_links:
                t = (l.get("type") or "").lower()
                if t in ("application/rss+xml", "application/atom+xml"):
                    rss_found = True
                    break
        except Exception:
            pass

        # AI-access artefacts (well-known)
        llms_found = False
        ai_manifest_found = False
        mcp_config_found = False
        openapi_found = False
        try:
            timeout = httpx.Timeout(5.0)
            async with httpx.AsyncClient(
                timeout=timeout,
                headers={"User-Agent": DEFAULT_USER_AGENT},
                follow_redirects=True,
            ) as client:
                base = f"{parsed.scheme or 'https'}://{hostname}"
                
                async def head_or_get(path: str) -> bool:
                    try:
                        r = await client.head(base + path)
                        if r.status_code == 200:
                            return True
                    except Exception:
                        pass
                    try:
                        r2 = await client.get(base + path)
                        return r2.status_code == 200 and bool(r2.text)
                    except Exception:
                        return False

                # llms.txt
                for p in ("/.well-known/llms.txt", "/llms.txt"):
                    if await head_or_get(p):
                        llms_found = True
                        break

                # AI Manifest
                for p in ("/.well-known/ai-manifest.json", "/ai-manifest.json"):
                    if await head_or_get(p):
                        ai_manifest_found = True
                        break

                # MCP config
                for p in ("/.well-known/mcp.json", "/mcp.json"):
                    if await head_or_get(p):
                        mcp_config_found = True
                        break

                # OpenAPI
                for p in ("/.well-known/openapi.json", "/openapi.json", "/api/openapi.json"):
                    if await head_or_get(p):
                        openapi_found = True
                        break
        except Exception:
            pass

        # On-page meta signals
        canonical_url = ""
        try:
            link_canon = soup.find("link", attrs={"rel": "canonical"})
            if link_canon and link_canon.get("href"):
                canonical_url = link_canon.get("href").strip()
        except Exception:
            canonical_url = ""

        noindex = False
        noarchive = False
        try:
            robots_meta = soup.find("meta", attrs={"name": "robots"})
            if robots_meta:
                rc = (robots_meta.get("content") or "").lower()
                noindex = "noindex" in rc
                noarchive = "noarchive" in rc
        except Exception:
            pass

        # Detect AI crawler directives in robots.txt (basic string search of downloaded content if available above)
        ai_crawlers_detected: list[str] = []
        try:
            timeout = httpx.Timeout(5.0)
            async with httpx.AsyncClient(
                timeout=timeout,
                headers={"User-Agent": DEFAULT_USER_AGENT},
                follow_redirects=True,
            ) as client:
                robots_url = f"{parsed.scheme or 'https'}://{hostname}/robots.txt"
                rr = await client.get(robots_url)
                if rr.status_code == 200 and rr.text:
                    rlow = rr.text.lower()
                    ai_keys = [
                        "gptbot", "anthropic-ai", "anthropic", "perplexity", "perplexitybot", "bingbot", "msnbot",
                        "google-extended", "ccbot", "facebookexternalhit"
                    ]
                    for k in ai_keys:
                        if k in rlow:
                            ai_crawlers_detected.append(k)
        except Exception:
            pass

        # Schema completeness (homepage only), reuse simple rules
        schema_completeness = 0
        try:
            rules = {
                "Organization": {"required": ["name"], "recommended": ["url", "logo", "sameAs"]},
                "Product": {"required": ["name"], "recommended": ["description", "brand", "offers"]},
                "FAQPage": {"required": ["mainEntity"], "recommended": []},
                "Article": {"required": ["headline"], "recommended": ["author", "datePublished"]},
                "LocalBusiness": {"required": ["name", "address"], "recommended": ["telephone", "openingHours"]},
            }
            scores: list[int] = []
            if schema_found:
                for t in schema_types:
                    r = rules.get(t)
                    if not r:
                        continue
                    missing_req = [k for k in r["required"] if k not in (html or "")]
                    missing_rec = [k for k in r["recommended"] if k not in (html or "")]
                    comp = int(100 - (len(missing_req) * 40 + len(missing_rec) * 10))
                    comp = max(0, comp)
                    scores.append(comp)
            schema_completeness = int(sum(scores) / max(1, len(scores))) if scores else 0
        except Exception:
            schema_completeness = 0

        # Visibility baseline (0..2): 0 none, 1 basic (Org/LocalBusiness), 2 strong (plus sameAs/contact/telephone)
        visibility_baseline = 0
        try:
            if schema_found and any(t.lower() in ("organization", "localbusiness") for t in schema_types):
                visibility_baseline = 1
                if any(k in (html or "").lower() for k in ["sameas", "contactpoint", "telephone", "address"]):
                    visibility_baseline = 2
        except Exception:
            pass

        # Agent readiness if any AI integration artefact exists
        agent_readiness = bool(llms_found or ai_manifest_found or mcp_config_found or openapi_found)

        # Heuristic score from crawler_service + AI readiness penalties
        audit = compute_audit_scores(soup, html)
        base_score = int(sum(audit.get(k, 0) for k in ["structure", "structured_data", "content"]) / 3) if audit else 60
        
        # AI Readiness Score Adjustments (stricter evaluation)
        ai_readiness_score = base_score
        
        # Penalty for missing critical AI artifacts (max -40 points total)
        artifact_penalties = 0
        if not llms_found:
            artifact_penalties += 8  # -8 for missing llms.txt
        if not ai_manifest_found:
            artifact_penalties += 8  # -8 for missing AI manifest
        if not mcp_config_found:
            artifact_penalties += 6  # -6 for missing MCP config
        if not openapi_found:
            artifact_penalties += 6  # -6 for missing OpenAPI spec
        if not rss_found:
            artifact_penalties += 6  # -6 for missing RSS feed
        if not robots_ai_optimized:
            artifact_penalties += 6  # -6 for missing AI crawler directives
        
        # Schema completeness penalty (max -20 points)
        if schema_completeness < 80:
            artifact_penalties += int((80 - schema_completeness) / 4)  # Up to -20 points
        
        # Apply penalties
        ai_readiness_score = max(0, min(100, ai_readiness_score - artifact_penalties))
        score = ai_readiness_score

        # Build SEO + GEO findings and opportunities (lightweight heuristics)
        findings: list[dict[str, Any]] = []
        opportunities: list[dict[str, Any]] = []

        def add_finding(fid: str, title: str, category: str, severity: str, description: str) -> None:
            findings.append({
                "id": fid,
                "category": category,
                "title": title,
                "severity": severity,  # "critical" | "warning" | "suggestion"
                "description": description,
            })

        def add_opp(oid: str, title: str, impact: str, description: str, gain: int) -> None:
            opportunities.append({
                "id": oid,
                "title": title,
                "impact": impact,  # "high" | "medium" | "low"
                "description": description,
                "estimatedScoreGain": gain,
            })

        # SEO checks
        if not description:
            add_finding("seo_meta_desc_missing", "Meta description missing", "SEO", "warning",
                        "No meta description detected. Add a compelling description (120–160 chars).")
            add_opp("gen_meta_desc", "Add meta description", "high",
                    "Provide a descriptive meta description for the homepage.", 4)

        if title:
            if len(title) < 30:
                add_finding("seo_title_short", "Title is short", "SEO", "suggestion",
                            f"Title seems short ({len(title)} chars). Target ~50–60 characters.")
            elif len(title) > 65:
                add_finding("seo_title_long", "Title is long", "SEO", "suggestion",
                            f"Title seems long ({len(title)} chars). Aim for ~50–60 characters.")
        else:
            add_finding("seo_title_missing", "Title tag missing", "SEO", "warning",
                        "No <title> detected. Set a concise keyword-rich title.")
            add_opp("gen_title", "Add title tag", "high", "Set a concise keyword-rich <title>.", 5)

        h1_count = len(headings["h1"])
        if h1_count == 0:
            add_finding("seo_h1_missing", "H1 heading missing", "SEO", "warning",
                        "No H1 heading detected. Add a single, descriptive H1.")
            add_opp("add_h1", "Add H1 heading", "high", "Add one H1 summarizing the page's primary topic.", 5)
        elif h1_count > 1:
            add_finding("seo_h1_multiple", "Multiple H1 headings", "SEO", "suggestion",
                        f"{h1_count} H1 headings detected. Prefer a single H1 for clarity.")

        if meta_tag_count < 30:
            add_finding("seo_meta_low", "Low meta tag density", "SEO", "suggestion",
                        f"Only {meta_tag_count} meta tags detected. Ensure essential meta tags are present.")

        # Structured data checks
        if not schema_found:
            add_finding("schema_missing", "JSON-LD schema not detected", "SEO", "warning",
                        "No JSON-LD schema detected. Add relevant Organization/LocalBusiness/FAQ/Article schemas.")
            add_opp("gen_jsonld_org", "Generate Organization JSON-LD", "high",
                    "Add Organization schema to improve AI understanding.", 6)
        else:
            if "LocalBusiness" not in [t.lower() for t in [*schema_types]] and "localbusiness" not in [t.lower() for t in schema_types]:
                add_finding("schema_localbusiness_missing", "LocalBusiness schema not found", "SEO", "suggestion",
                            "Consider adding LocalBusiness schema for better local/AI alignment.")
                add_opp("gen_jsonld_localbusiness", "Generate LocalBusiness JSON-LD", "medium",
                        "Add LocalBusiness schema to encode NAP and opening hours.", 4)

        # Technical + GEO checks
        if not robots_found:
            add_finding("robots_missing", "robots.txt not found", "Technical", "warning",
                        "robots.txt not accessible. Add a minimal robots.txt.")
            add_opp("gen_robots", "Generate robots.txt", "high",
                    "Add robots.txt to control crawling and expose AI directives if needed.", 4)
        elif not robots_ai_optimized:
            add_finding("robots_ai", "AI directives not detected in robots.txt", "GEO", "suggestion",
                        "Consider adding AI crawler directives (e.g., gptbot) as appropriate.")

        if not sitemap_found:
            add_finding("sitemap_missing", "sitemap.xml not found", "Technical", "warning",
                        "No sitemap.xml detected. Provide a sitemap for better discovery.")
            add_opp("gen_sitemap", "Generate sitemap.xml", "high",
                    "Add a sitemap.xml to help search/AI engines discover pages.", 5)

        if not rss_found:
            add_finding("rss_missing", "RSS/Atom feed not found", "SEO", "suggestion",
                        "No syndication feed detected. Consider adding a blog feed.")
            add_opp("gen_rss", "Generate RSS feed", "low", "Add RSS/Atom feed to surface updates.", 2)

        if not llms_found:
            add_finding("llms_missing", "llms.txt not found", "GEO", "suggestion",
                        "Add llms.txt to guide LLM agent access and usage policies.")
            add_opp("gen_llms", "Generate llms.txt", "medium",
                    "Provide llms.txt to document AI access preferences.", 3)

        if not ai_manifest_found:
            add_finding("ai_manifest_missing", "AI Manifest not found", "GEO", "suggestion",
                        "Add ai-manifest.json to describe AI integration capabilities.")
            add_opp("gen_ai_manifest", "Generate AI Manifest", "medium",
                    "Provide /ai-manifest.json for AI agent integration.", 3)

        if not mcp_config_found:
            add_finding("mcp_missing", "MCP config not found", "GEO", "suggestion",
                        "Add MCP config to describe available tools/endpoints for agents.")
            add_opp("gen_mcp", "Generate MCP config", "medium",
                    "Provide /mcp.json to expose machine-consumable tools.", 3)

        if not openapi_found:
            add_finding("openapi_missing", "OpenAPI spec not found", "GEO", "suggestion",
                        "Add an OpenAPI spec if you expose APIs useful to AI agents.")
            add_opp("gen_openapi", "Generate OpenAPI spec", "medium",
                    "Provide /openapi.json to document available endpoints.", 4)

        # Compute issues summary
        issues_counts = {
            "critical": sum(1 for f in findings if f["severity"] == "critical"),
            "warnings": sum(1 for f in findings if f["severity"] == "warning"),
            "suggestions": sum(1 for f in findings if f["severity"] == "suggestion"),
        }

        # Simple artifact comparison text
        artifact_flags = [
            schema_found, robots_found, sitemap_found, rss_found,
            llms_found, ai_manifest_found, mcp_config_found, openapi_found
        ]
        artifacts_total = len(artifact_flags)
        artifacts_found = sum(1 for x in artifact_flags if x)
        missing_labels = []
        if not schema_found: missing_labels.append("schema")
        if not robots_found: missing_labels.append("robots.txt")
        if not sitemap_found: missing_labels.append("sitemap")
        if not rss_found: missing_labels.append("rss")
        if not llms_found: missing_labels.append("llms.txt")
        if not ai_manifest_found: missing_labels.append("ai-manifest")
        if not mcp_config_found: missing_labels.append("mcp")
        if not openapi_found: missing_labels.append("openapi")
        comparison_text = f"Artifacts found: {artifacts_found}/{artifacts_total}. Missing: {', '.join(missing_labels) or 'none'}."

        result = {
            "success": True,
            "url": url_str,
            "score": score,
            "issues": issues_counts,
            "findings": findings,
            "opportunities": opportunities,
            "technicalStatus": {
                "schema": schema_found,
                "schemaTypes": schema_types,
                "schemaCompleteness": schema_completeness,
                "robotsTxt": robots_found,
                "robotsAiOptimized": robots_ai_optimized,
                "robotsNoindex": noindex,
                "robotsNoarchive": noarchive,
                "aiCrawlerDirectives": ai_crawlers_detected,
                "sitemap": sitemap_found,
                "sitemapUrls": sitemap_urls,
                "rssFeed": rss_found,
                "rssItems": rss_items,
                "llmsTxtFound": llms_found,
                "aiManifestFound": ai_manifest_found,
                "mcpConfigFound": mcp_config_found,
                "openApiFound": openapi_found,
                "agentReadiness": agent_readiness,
                "visibilityBaseline": visibility_baseline,
                "canonicalUrl": canonical_url,
                "metaTagCount": meta_tag_count,
                "headings": headings,
                "h1Count": h1_count,
                "h1Texts": headings["h1"][:5],  # First 5 H1s
                "h2Count": len(headings["h2"]),
                "h3Count": len(headings["h3"]),
            },
            "contentAnalysis": {
                "title": title,
                "description": description,
                "hasFaqContent": "faq" in (title + " " + description).lower(),
                "headingStructure": {"h1": len(headings["h1"]), "h2": len(headings["h2"]), "h3": len(headings["h3"])},
            },
            "competitors": [],
            "competitorComparison": comparison_text,
            "crawledAt": now,
        }
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Initial scan failed: {e}")


@router.post("/content/chunks", response_model=ContentChunksResponse)
async def content_chunks(req: ContentChunksRequest) -> ContentChunksResponse:
    try:
        markdown, _ = await scrape_markdown(str(req.url))
        chunks = generate_content_chunks(markdown, max_chunks=req.max_chunks)
        return ContentChunksResponse(url=req.url, chunks=chunks)
    except (Crawl4AINotConfigured, GeminiNotConfigured) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Content chunking failed: {e}")


@router.post("/content/questions", response_model=QuestionsResponse)
async def content_questions(req: QuestionsRequest) -> QuestionsResponse:
    try:
        urls = []
        if req.urls:
            urls.extend([str(u) for u in req.urls])
        if req.url:
            urls.append(str(req.url))
        if not urls:
            raise HTTPException(status_code=400, detail="Provide 'url' or 'urls'.")

        markdown_parts = []
        for u in urls:
            md, _ = await scrape_markdown(u)
            if md:
                markdown_parts.append(md)

        combined_md = "\n\n---\n\n".join(markdown_parts)
        items = extract_questions(combined_md, max_items=req.max_items)
        return QuestionsResponse(items=items)
    except (Crawl4AINotConfigured, GeminiNotConfigured) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Question extraction failed: {e}")


@router.post("/content/review-response", response_model=ReviewResponse)
async def review_response(req: ReviewRequest) -> ReviewResponse:
    try:
        reply = generate_review_reply(req.review_text)
        return ReviewResponse(reply=reply)
    except GeminiNotConfigured as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Review response generation failed: {e}")


@router.post("/analysis/semantic-coverage", response_model=SemanticCoverageResponse)
async def semantic_coverage(req: SemanticCoverageRequest) -> SemanticCoverageResponse:
    try:
        # 1) My content (single page scrape)
        my_md, _ = await scrape_markdown(str(req.my_url))

        # 2) Competitors (crawl top_n pages and concatenate markdown)
        comp_map = {}
        for comp_url in req.competitors:
            comp_url_str = str(comp_url)
            host = urlparse(comp_url_str).netloc or comp_url_str
            pages, _ = await crawl_markdown(comp_url_str, limit=req.top_n)
            if pages:
                md_join = "\n\n---\n\n".join(
                    [p.get("markdown") for p in pages if isinstance(p, dict) and p.get("markdown")]
                )
                if not md_join:
                    # fallback to single page scrape if crawl produced no markdowns
                    md_single, _ = await scrape_markdown(comp_url_str)
                    md_join = md_single
            else:
                md_single, _ = await scrape_markdown(comp_url_str)
                md_join = md_single
            comp_map[host] = md_join or ""

        gaps = semantic_coverage_analysis(my_md, comp_map)
        return SemanticCoverageResponse(gaps=gaps)
    except (Crawl4AINotConfigured, GeminiNotConfigured) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Semantic coverage failed: {e}")

@router.post("/analysis/topic-recognition")
async def topic_recognition_backend(req: dict):
    """
    Lightweight topic recognition without LLM.
    Input: { url?: str, content?: str, title?: str }
    Produces: primaryTopic, secondaryTopics, industry, contentType, keywords, entities, sentiment, targetAudience, confidence
    """
    try:
        url = (req.get("url") if isinstance(req, dict) else None)
        content = (req.get("content") if isinstance(req, dict) else None) or ""
        title = (req.get("title") if isinstance(req, dict) else None) or ""

        # Fetch if no content provided
        if url and not content:
            html = await fetch_html(str(url))
            soup = BeautifulSoup(html or "", "html.parser")
            title = title or ((soup.title.string or "").strip() if soup.title and soup.title.string else "")
            content = soup.get_text(" ", strip=True)[:150000]

        text = f"{title} {content}".strip()
        low = text.lower()

        # Industry heuristics (de/en)
        industry_map = {
            "consulting": ["beratung", "unternehmensberatung", "consulting", "strategie", "digitalisierung"],
            "marketing": ["marketing", "seo", "content", "kampagne", "social media"],
            "healthcare": ["gesundheit", "klinik", "arzt", "patient", "medical", "pharma"],
            "ecommerce": ["shop", "e-commerce", "checkout", "produkt", "warenkorb"],
            "software": ["software", "saas", "plattform", "api", "entwicklung"],
        }
        industry = "general"
        for ind, kws in industry_map.items():
            if any(k in low for k in kws):
                industry = ind
                break

        # Keywords (very naive frequency, filter stopwords & short tokens)
        tokens = [t for t in re.findall(r"[A-Za-zÄÖÜäöüß\-]{3,}", text) if len(t) >= 3]
        stop = set("""und oder der die das mit aus für von sowie the and you your are was were our bei zum zur ein eine eines einem einer ist im in zu auf den dem des als wir sie er es an am vom vom nach bis durch etc http https www com de""".split())
        tokens_norm = [t.lower() for t in tokens if t.lower() not in stop]
        top_kw = [w for w, _ in Counter(tokens_norm).most_common(15)]

        # Primary/secondary topic heuristics
        primaryTopic = (top_kw[0] if top_kw else (title.split(" ")[0] if title else "website")).capitalize()
        secondaryTopics = [k.capitalize() for k in top_kw[1:6]]

        # Entities: pick capitalized words as simple entities (very rough)
        entities_raw = re.findall(r"\b([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]{2,})\b", text)
        entities = [{"name": e, "type": "keyword"} for e, _ in Counter(entities_raw).most_common(8)]

        # Target audience
        targetAudience = "B2B" if any(k in low for k in ["unternehmen", "kmu", "firma", "business", "b2b"]) else "general"

        # Sentiment proxy (not accurate)
        sentiment = "neutral"
        if any(k in low for k in ["erfolg", "vorteil", "optimierung", "gewinn", "stark"]):
            sentiment = "positive"

        # Confidence heuristic
        confidence = 70 if primaryTopic else 50

        return {
            "primaryTopic": primaryTopic,
            "secondaryTopics": secondaryTopics,
            "industry": industry,
            "contentType": "web",
            "keywords": top_kw[:10],
            "entities": entities,
            "sentiment": sentiment,
            "targetAudience": targetAudience,
            "confidence": confidence,
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Topic recognition failed: {e}")

@router.post("/analysis/content-gap")
async def content_gap_backend(req: dict):
    """
    Very lightweight content gap: look for expected sections and questions for typical business sites.
    Input: { url?: str, content?: str, title?: str, industry?: str, competitors?: list[str] }
    Output: gaps{...}, missingQuestions, missingTopics, schemaOpportunities, contentScore, summary
    """
    try:
        url = (req.get("url") if isinstance(req, dict) else None)
        content = (req.get("content") if isinstance(req, dict) else None) or ""
        title = (req.get("title") if isinstance(req, dict) else None) or ""
        industry = (req.get("industry") if isinstance(req, dict) else None) or "general"
        competitors = (req.get("competitors") if isinstance(req, dict) else None) or []

        if url and not content:
            html = await fetch_html(str(url))
            soup = BeautifulSoup(html or "", "html.parser")
            title = title or ((soup.title.string or "").strip() if soup.title and soup.title.string else "")
            content = soup.get_text(" ", strip=True)[:200000]
        low = f"{title} {content}".lower()

        # Expected sections/anchors for a small business site (de/en)
        must_haves = [
            ("leistungen", ["leistungen", "services", "angebot", "was wir bieten", "solutions"]),
            ("referenzen", ["referenzen", "kunden", "cases", "fallstudien", "case studies"]),
            ("über uns", ["über uns", "unternehmen", "team", "wer wir sind", "about"]),
            ("preise", ["preise", "pricing", "pakete", "kosten"]),
            ("kontakt", ["kontakt", "contact", "anfrage", "termin", "beraten"]),
            ("faq", ["faq", "häufige fragen", "fragen und antworten"]),
            ("blog/news", ["blog", "news", "aktuell", "magazin"]),
        ]

        missingTopics: list[str] = []
        for label, kws in must_haves:
            if not any(k in low for k in kws):
                missingTopics.append(label)

        # Missing questions heuristic
        default_questions = [
            "Welche Leistungen bieten Sie genau an?",
            "Wie unterstützen Sie KMU bei der Digitalisierung?",
            "Wie sieht der typische Projektablauf aus?",
            "Welche Referenzen oder Fallstudien gibt es?",
            "Welche Kosten/Preismodelle gibt es?",
            "Wie kann ich einen Termin oder eine Erstberatung buchen?",
        ]
        missingQuestions = default_questions[:]

        # Schema opportunities (based on sections not found)
        schemaOpps = []
        if "faq" in missingTopics:
            schemaOpps.append("Add FAQPage schema to cover common questions.")
        if "referenzen" in missingTopics:
            schemaOpps.append("Add Review or CreativeWork schema to showcase case studies.")
        if "preise" in missingTopics:
            schemaOpps.append("Consider Offer/PriceSpecification for better productization.")

        # Content score: penalize missing sections
        contentScore = max(10, 100 - len(missingTopics) * 12)

        # Summary
        summary = f"{len(missingTopics)} missing core sections detected: {', '.join(missingTopics) if missingTopics else 'none'}."

        # Minimal gap items
        gaps = [
            {
                "type": "section",
                "title": "Fehlende Kernsektionen",
                "description": f"Diese Bereiche fehlen aktuell: {', '.join(missingTopics) if missingTopics else 'keine'}",
                "impact": "high" if len(missingTopics) >= 3 else "medium",
                "recommendation": "Ergänzen Sie die oben genannten Seiten/Abschnitte mit klaren CTAs und Beispielen.",
                "estimatedEffort": "medium",
            }
        ]

        return {
            "gaps": gaps,
            "missingQuestions": missingQuestions,
            "missingTopics": missingTopics,
            "schemaOpportunities": schemaOpps,
            "contentScore": int(contentScore),
            "summary": summary,
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Content gap analysis failed: {e}")


@router.post("/analysis/nap-audit", response_model=NAPAuditResponse)
async def nap_audit(req: NAPAuditRequest) -> NAPAuditResponse:
    """
    Enhanced NAP audit that scans multiple relevant pages:
    - Homepage
    - /impressum, /imprint
    - /kontakt, /contact
    - /about, /ueber-uns
    Also handles www/non-www redirects.
    """
    from ..models.schemas import NAPData
    
    try:
        base_url = str(req.url).rstrip("/")
        parsed = urlparse(base_url)
        hostname = parsed.netloc
        scheme = parsed.scheme or "https"
        
        # Handle www/non-www variants
        if hostname.startswith("www."):
            hostname_alt = hostname[4:]
        else:
            hostname_alt = f"www.{hostname}"
        
        bases = [
            f"{scheme}://{hostname}",
            f"{scheme}://{hostname_alt}",
        ]
        
        # Common NAP page paths - prioritize impressum/contact pages
        nap_paths = [
            "/impressum",
            "/imprint", 
            "/kontakt",
            "/contact",
            "/about",
            "/ueber-uns",
            "/about-us",
            "/legal",
            "",  # Homepage last
        ]
        
        # Build full URL list
        nap_pages = []
        for base in bases:
            for path in nap_paths:
                nap_pages.append(f"{base}{path}")
        
        # Collect markdown from all accessible pages
        all_nap_sections = []
        scanned_pages = []
        
        # NAP-relevant keywords to look for
        nap_keywords = [
            "impressum", "kontakt", "contact", "address", "adresse",
            "telefon", "phone", "email", "e-mail", "gmbh", "ug", "ag", "inc", "ltd",
            "geschäftsführer", "managing director", "ceo", "inhaber",
            "straße", "street", "plz", "postleitzahl", "berlin", "münchen", "hamburg"
        ]
        
        for page_url in nap_pages:
            if len(scanned_pages) >= 5:  # Limit to 5 pages
                break
                
            try:
                md, _ = await scrape_markdown(page_url)
                if md and len(md.strip()) > 100:
                    md_lower = md.lower()
                    
                    # Check if this page has NAP-relevant content
                    has_nap_content = any(k in md_lower for k in nap_keywords)
                    
                    if has_nap_content:
                        scanned_pages.append(page_url)
                        
                        # Extract the most relevant NAP section (around impressum/kontakt keywords)
                        nap_section = ""
                        for keyword in ["impressum", "kontakt", "contact", "imprint", "about us", "über uns"]:
                            idx = md_lower.find(keyword)
                            if idx >= 0:
                                # Extract 4000 chars around the keyword
                                start = max(0, idx - 500)
                                end = min(len(md), idx + 3500)
                                section = md[start:end]
                                if len(section) > len(nap_section):
                                    nap_section = section
                        
                        if not nap_section:
                            # Take first 4000 chars if no keyword found
                            nap_section = md[:4000]
                        
                        all_nap_sections.append(f"--- PAGE: {page_url} ---\n{nap_section}")
                        
            except Exception:
                continue
        
        if not all_nap_sections:
            # Fallback: try homepage
            for base in bases:
                try:
                    md, _ = await scrape_markdown(base)
                    if md:
                        all_nap_sections = [md[:5000]]
                        scanned_pages = [base]
                        break
                except Exception:
                    continue
        
        if not all_nap_sections:
            return NAPAuditResponse(nap=NAPData(
                name=None, address=None, phone=None, email=None,
                socials=[], scanned_pages=[], pages_count=0,
                completeness="0/4", is_complete=False
            ))
        
        # Combine NAP sections (limit total size)
        combined_content = "\n\n".join(all_nap_sections)
        if len(combined_content) > 20000:
            combined_content = combined_content[:20000]
        
        nap_raw = extract_nap_json(combined_content)
        
        # Calculate completeness
        fields_found = sum(1 for k in ["name", "address", "phone", "email"] if nap_raw.get(k))
        
        # Build NAPData response
        nap_data = NAPData(
            name=nap_raw.get("name"),
            address=nap_raw.get("address"),
            phone=nap_raw.get("phone"),
            email=nap_raw.get("email"),
            socials=[],
            scanned_pages=scanned_pages,
            pages_count=len(scanned_pages),
            completeness=f"{fields_found}/4",
            is_complete=fields_found >= 3
        )
        
        return NAPAuditResponse(nap=nap_data)
    except (Crawl4AINotConfigured, GeminiNotConfigured) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"NAP audit failed: {e}")

@router.post("/analysis/schema-audit")
async def schema_audit_backend(req: dict):
    """
    Lightweight schema audit: parses JSON-LD on a page and reports completeness for common types.
    Accepts body: { "url": str, "html"?: str }
    """
    try:
        html = (req.get("html") if isinstance(req, dict) else None)
        url = (req.get("url") if isinstance(req, dict) else None)
        if not html:
            if not url:
                raise HTTPException(status_code=400, detail="Provide 'url' or 'html'.")
            html = await fetch_html(str(url))
        soup = BeautifulSoup(html or "", "html.parser")

        raw_schemas = []
        for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
            try:
                raw_schemas.append(json.loads(script.string or "null"))
            except Exception:
                continue

        def collect_types(obj):
            types: list[str] = []
            if isinstance(obj, dict):
                t = obj.get("@type")
                if isinstance(t, str):
                    types.append(t)
                elif isinstance(t, list):
                    types += [x for x in t if isinstance(x, str)]
                for v in obj.values():
                    types += collect_types(v)
            elif isinstance(obj, list):
                for it in obj:
                    types += collect_types(it)
            return types

        found_types: list[str] = []
        for rs in raw_schemas:
            found_types += collect_types(rs)
        found_types = list(dict.fromkeys(found_types))

        # Basic required/recommended sets for common types
        rules = {
            "Organization": {"required": ["name"], "recommended": ["url", "logo", "sameAs"]},
            "Product": {"required": ["name"], "recommended": ["description", "brand", "offers"]},
            "FAQPage": {"required": ["mainEntity"], "recommended": []},
            "Article": {"required": ["headline"], "recommended": ["author", "datePublished"]},
            "LocalBusiness": {"required": ["name", "address"], "recommended": ["telephone", "openingHours"]},
        }

        schemas_found: list[dict] = []
        for t in found_types:
            r = rules.get(t)
            if not r:
                continue
            # Heuristic: treat presence by string match within HTML. A deeper JSON inspection could be added later.
            missing_req = [k for k in r["required"] if k not in (html or "")]
            missing_rec = [k for k in r["recommended"] if k not in (html or "")]
            completeness = int(100 - (len(missing_req) * 40 + len(missing_rec) * 10))
            completeness = max(0, completeness)
            schemas_found.append({
                "type": t,
                "completeness": completeness,
                "missingRequired": missing_req,
                "missingRecommended": missing_rec,
                "issues": [],
                "valid": completeness >= 50,
            })

        missing_schemas = []
        for t in rules.keys():
            if t not in found_types:
                missing_schemas.append({
                    "type": t,
                    "reason": "Not detected on page",
                    "impact": "high" if t == "LocalBusiness" else "medium",
                })

        overall = int(sum(s["completeness"] for s in schemas_found) / max(1, len(schemas_found)))
        recommendations = []
        if missing_schemas:
            recommendations.append("Add missing schema types where relevant.")
        if any(s["missingRequired"] for s in schemas_found):
            recommendations.append("Fill missing required properties for detected types.")
        summary = f"Detected types: {', '.join(found_types) or 'none'}; overall completeness ~{overall}%."

        rich = []
        if "FAQPage" in found_types:
            rich.append("FAQ")
        if "Product" in found_types:
            rich.append("Product")
        if "Article" in found_types:
            rich.append("Article")

        return {
            "rawSchemas": raw_schemas,
            "schemasFound": schemas_found,
            "missingSchemas": missing_schemas,
            "overallScore": overall,
            "recommendations": recommendations,
            "googleRichResultsEligible": rich,
            "summary": summary,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Schema audit failed: {e}")


@router.post("/analysis/schema-audit-multi")
async def schema_audit_multi_page(req: dict):
    """
    Multi-page schema audit: scans multiple pages on a domain for JSON-LD.
    Accepts body: { "url": str, "max_pages": int (default 10) }
    Returns per-page schema data and aggregate recommendations.
    """
    try:
        url = (req.get("url") if isinstance(req, dict) else None)
        max_pages = (req.get("max_pages") if isinstance(req, dict) else 10) or 10
        
        if not url:
            raise HTTPException(status_code=400, detail="Provide 'url'.")
        
        base_url = str(url).rstrip("/")
        parsed = urlparse(base_url)
        hostname = parsed.netloc
        scheme = parsed.scheme or "https"
        
        # Handle www/non-www
        if hostname.startswith("www."):
            hostname_alt = hostname[4:]
        else:
            hostname_alt = f"www.{hostname}"
        
        bases = [f"{scheme}://{hostname}", f"{scheme}://{hostname_alt}"]
        
        # Important pages to check
        page_paths = [
            "",  # Homepage
            "/impressum",
            "/kontakt",
            "/contact",
            "/about",
            "/ueber-uns",
            "/leistungen",
            "/services",
            "/produkte",
            "/products",
            "/blog",
            "/news",
            "/faq",
        ]
        
        # Build URL list
        pages_to_check = []
        for base in bases:
            for path in page_paths:
                pages_to_check.append(f"{base}{path}")
        
        # Schema rules
        rules = {
            "Organization": {"required": ["name"], "recommended": ["url", "logo", "sameAs", "contactPoint"]},
            "LocalBusiness": {"required": ["name", "address"], "recommended": ["telephone", "openingHours", "geo"]},
            "Product": {"required": ["name"], "recommended": ["description", "brand", "offers", "image"]},
            "Service": {"required": ["name"], "recommended": ["description", "provider", "areaServed"]},
            "FAQPage": {"required": ["mainEntity"], "recommended": []},
            "Article": {"required": ["headline"], "recommended": ["author", "datePublished", "image"]},
            "BlogPosting": {"required": ["headline"], "recommended": ["author", "datePublished"]},
            "WebPage": {"required": ["name"], "recommended": ["description", "breadcrumb"]},
            "BreadcrumbList": {"required": ["itemListElement"], "recommended": []},
            "ContactPage": {"required": [], "recommended": ["name", "description"]},
        }
        
        per_page_results = []
        all_types_found = set()
        all_schemas = []
        scanned_count = 0
        
        for page_url in pages_to_check:
            if scanned_count >= max_pages:
                break
                
            try:
                html = await fetch_html(page_url)
                if not html or len(html) < 100:
                    continue
                    
                scanned_count += 1
                soup = BeautifulSoup(html, "html.parser")
                
                # Extract JSON-LD
                page_schemas = []
                page_types = []
                
                for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
                    try:
                        schema_data = json.loads(script.string or "null")
                        if schema_data:
                            page_schemas.append(schema_data)
                            
                            # Collect types
                            def get_types(obj):
                                types = []
                                if isinstance(obj, dict):
                                    t = obj.get("@type")
                                    if isinstance(t, str):
                                        types.append(t)
                                    elif isinstance(t, list):
                                        types.extend([x for x in t if isinstance(x, str)])
                                    for v in obj.values():
                                        types.extend(get_types(v))
                                elif isinstance(obj, list):
                                    for item in obj:
                                        types.extend(get_types(item))
                                return types
                            
                            page_types.extend(get_types(schema_data))
                    except Exception:
                        continue
                
                page_types = list(dict.fromkeys(page_types))
                all_types_found.update(page_types)
                all_schemas.extend(page_schemas)
                
                # Analyze completeness per type
                type_analysis = []
                for t in page_types:
                    r = rules.get(t)
                    if r:
                        # Check properties in HTML (simple heuristic)
                        missing_req = [k for k in r["required"] if k.lower() not in html.lower()]
                        missing_rec = [k for k in r["recommended"] if k.lower() not in html.lower()]
                        comp = max(0, 100 - (len(missing_req) * 40 + len(missing_rec) * 10))
                        type_analysis.append({
                            "type": t,
                            "completeness": comp,
                            "missingRequired": missing_req,
                            "missingRecommended": missing_rec,
                        })
                
                per_page_results.append({
                    "url": page_url,
                    "schemasFound": len(page_schemas),
                    "types": page_types,
                    "typeAnalysis": type_analysis,
                    "hasLocalBusiness": "LocalBusiness" in page_types,
                    "hasOrganization": "Organization" in page_types,
                    "hasFAQ": "FAQPage" in page_types,
                })
                
            except Exception:
                continue
        
        # Aggregate analysis
        all_types_list = list(all_types_found)
        missing_important = []
        
        important_types = ["Organization", "LocalBusiness", "WebPage"]
        for t in important_types:
            if t not in all_types_found:
                missing_important.append({
                    "type": t,
                    "reason": f"{t} schema not found on any scanned page",
                    "impact": "high" if t in ["Organization", "LocalBusiness"] else "medium",
                    "recommendation": f"Add {t} schema to improve AI/search visibility"
                })
        
        # Calculate overall score
        total_completeness = []
        for page in per_page_results:
            for ta in page.get("typeAnalysis", []):
                total_completeness.append(ta["completeness"])
        
        overall_score = int(sum(total_completeness) / max(1, len(total_completeness))) if total_completeness else 0
        
        # Generate recommendations
        recommendations = []
        if not any(p.get("hasLocalBusiness") for p in per_page_results):
            recommendations.append({
                "priority": "high",
                "action": "Add LocalBusiness schema",
                "description": "No LocalBusiness schema found. Add it to encode NAP data for local SEO.",
                "pages": ["/impressum", "/kontakt"]
            })
        if not any(p.get("hasOrganization") for p in per_page_results):
            recommendations.append({
                "priority": "high", 
                "action": "Add Organization schema",
                "description": "No Organization schema found. Add it to the homepage.",
                "pages": ["/"]
            })
        if not any(p.get("hasFAQ") for p in per_page_results):
            recommendations.append({
                "priority": "medium",
                "action": "Consider adding FAQPage schema",
                "description": "FAQ schema can enable rich results in search.",
                "pages": ["/faq", "/"]
            })
        
        return {
            "pagesScanned": scanned_count,
            "perPageResults": per_page_results,
            "allTypesFound": all_types_list,
            "missingImportant": missing_important,
            "overallScore": overall_score,
            "recommendations": recommendations,
            "summary": f"Scanned {scanned_count} pages. Found {len(all_types_list)} schema types. Overall completeness: {overall_score}%."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Multi-page schema audit failed: {e}")


@router.post("/analysis/fact-check", response_model=FactCheckResponse)
async def fact_check(req: FactCheckRequest) -> FactCheckResponse:
    try:
        if not req.context_urls:
            raise HTTPException(status_code=400, detail="Provide at least one context URL.")

        md_parts = []
        for u in req.context_urls:
            md, _ = await scrape_markdown(str(u))
            if md:
                md_parts.append(md)

        context_md = "\n\n---\n\n".join(md_parts)
        result = fact_check_claim(req.claim, context_md)
        return FactCheckResponse(**result)
    except (Crawl4AINotConfigured, GeminiNotConfigured) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Fact check failed: {e}")


@router.post("/monitoring/hallucination-detect", response_model=HallucinationDetectResponse)
async def hallucination_detect(req: HallucinationDetectRequest) -> HallucinationDetectResponse:
    try:
        brand_md, _ = await scrape_markdown(str(req.brand_url))
        findings = detect_hallucinations(req.generated_text, brand_md)
        return HallucinationDetectResponse(findings=findings)
    except (Crawl4AINotConfigured, GeminiNotConfigured) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Hallucination detection failed: {e}")


@router.post("/agents/runner", response_model=AgentRunResponse)
async def agents_runner(req: AgentRunRequest) -> AgentRunResponse:
    try:
        result = await run_agent(goal=req.goal, urls=[str(u) for u in (req.urls or [])], constraints=req.constraints)
        return AgentRunResponse(**result)
    except (Crawl4AINotConfigured, GeminiNotConfigured) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Agent runner failed: {e}")


@router.post("/generation/jsonld", response_model=JSONLDGenerateResponse)
async def generation_jsonld(req: JSONLDGenerateRequest) -> JSONLDGenerateResponse:
    try:
        md, _ = await scrape_markdown(str(req.url))
        jsonld = generate_jsonld(req.schema_type, md)
        return JSONLDGenerateResponse(jsonld=jsonld)
    except (Crawl4AINotConfigured, GeminiNotConfigured) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"JSON-LD generation failed: {e}")


@router.post("/generation/openapi", response_model=OpenAPIGenerateResponse)
async def generation_openapi(req: OpenAPIGenerateRequest) -> OpenAPIGenerateResponse:
    try:
        md, _ = await scrape_markdown(str(req.url))
        spec = generate_openapi_from_markdown(md)
        return OpenAPIGenerateResponse(openapi=spec)
    except (Crawl4AINotConfigured, GeminiNotConfigured) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAPI generation failed: {e}")


@router.post("/generation/rss", response_model=RSSGenerateResponse)
async def generation_rss(req: RSSGenerateRequest) -> RSSGenerateResponse:
    try:
        md, _ = await scrape_markdown(str(req.url))
        rss = generate_rss_from_markdown(md)
        return RSSGenerateResponse(rss=rss)
    except (Crawl4AINotConfigured, GeminiNotConfigured) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"RSS generation failed: {e}")


@router.post("/generation/robots", response_model=RobotsGenerateResponse)
async def generation_robots(req: RobotsGenerateRequest) -> RobotsGenerateResponse:
    try:
        md, _ = await scrape_markdown(str(req.url))
        robots = generate_robots_from_markdown(md)
        return RobotsGenerateResponse(robots=robots)
    except (Crawl4AINotConfigured, GeminiNotConfigured) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"robots.txt generation failed: {e}")


@router.post("/generation/sitemap", response_model=SitemapGenerateResponse)
async def generation_sitemap(req: SitemapGenerateRequest) -> SitemapGenerateResponse:
    try:
        md, _ = await scrape_markdown(str(req.url))
        sitemap = generate_sitemap_from_markdown(md)
        return SitemapGenerateResponse(sitemap=sitemap)
    except (Crawl4AINotConfigured, GeminiNotConfigured) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"sitemap.xml generation failed: {e}")


@router.post("/generation/mcp-config", response_model=MCPConfigGenerateResponse)
async def generation_mcp_config(req: MCPConfigGenerateRequest) -> MCPConfigGenerateResponse:
    try:
        md, _ = await scrape_markdown(str(req.url))
        cfg = generate_mcp_config_from_markdown(md)
        return MCPConfigGenerateResponse(config=cfg)
    except (Crawl4AINotConfigured, GeminiNotConfigured) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"MCP config generation failed: {e}")


@router.post("/generation/ai-manifest", response_model=AIManifestGenerateResponse)
async def generation_ai_manifest(req: AIManifestGenerateRequest) -> AIManifestGenerateResponse:
    try:
        md, _ = await scrape_markdown(str(req.url))
        manifest = generate_ai_manifest_from_markdown(md)
        return AIManifestGenerateResponse(manifest=manifest)
    except (Crawl4AINotConfigured, GeminiNotConfigured) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI manifest generation failed: {e}")


@router.post("/generation/llms", response_model=LlmsTxtGenerateResponse)
async def generation_llms_txt(req: LlmsTxtGenerateRequest) -> LlmsTxtGenerateResponse:
    """
    Generate a llms.txt file for the given URL.
    llms.txt describes how LLMs should interact with the site content.
    """
    try:
        md, _ = await scrape_markdown(str(req.url))
        llms_txt = generate_llms_txt_from_markdown(md)
        return LlmsTxtGenerateResponse(llms_txt=llms_txt)
    except (Crawl4AINotConfigured, GeminiNotConfigured) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"llms.txt generation failed: {e}")
    
    
# --- URL enumeration (sitemap + crawl fallback) ---
async def _fetch_text(client: httpx.AsyncClient, url: str) -> str:
    try:
        r = await client.get(url)
        if r.status_code == 200:
            return r.text or ""
    except Exception:
        pass
    return ""
    
    
async def _enumerate_sitemap_urls(root_url: str, max_urls: int = 1000) -> list[str]:
    parsed = urlparse(root_url)
    scheme = parsed.scheme or "https"
    host = parsed.netloc or parsed.path
    base_sitemap = f"{scheme}://{host}/sitemap.xml"
    
    urls: list[str] = []
    seen: set[str] = set()
    to_visit: list[str] = [base_sitemap]
    visited: set[str] = set()
    
    timeout = httpx.Timeout(10.0)
    async with httpx.AsyncClient(
        timeout=timeout,
        headers={"User-Agent": DEFAULT_USER_AGENT},
        follow_redirects=True,
    ) as client:
        while to_visit and len(urls) < max_urls:
            sm_url = to_visit.pop(0)
            if sm_url in visited:
                continue
            visited.add(sm_url)
            xml = await _fetch_text(client, sm_url)
            if not xml:
                continue
            soup = BeautifulSoup(xml, "xml")
            
            # sitemap index
            if soup.find("sitemapindex"):
                for sm in soup.find_all("sitemap"):
                    loc = sm.find("loc")
                    if loc and loc.text:
                        loc_text = loc.text.strip()
                        if loc_text not in visited:
                            to_visit.append(loc_text)
                continue
            
            # urlset
            if soup.find("urlset"):
                for u in soup.find_all("url"):
                    loc = u.find("loc")
                    if not loc or not loc.text:
                        continue
                    loc_text = loc.text.strip()
                    loc_parsed = urlparse(loc_text)
                    if (loc_parsed.netloc or loc_parsed.path).endswith(host):
                        if loc_text not in seen:
                            seen.add(loc_text)
                            urls.append(loc_text)
                            if len(urls) >= max_urls:
                                break
    return urls[:max_urls]
    
    
def _extract_urls_from_crawl4ai_raw(data: dict, root_host: str, max_urls: int) -> list[str]:
    urls: set[str] = set()
    
    def walk(obj: any):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, str):
                    key = (k or "").lower()
                    if key in {"url", "link", "loc", "source", "sourceurl", "pageurl"} and v.startswith("http"):
                        try:
                            vp = urlparse(v)
                            if (vp.netloc or vp.path).endswith(root_host):
                                urls.add(v)
                        except Exception:
                            pass
                else:
                    walk(v)
        elif isinstance(obj, list):
            for it in obj:
                walk(it)
    
    try:
        walk(data)
    except Exception:
        pass
    return list(urls)[:max_urls]
    
    
@router.post("/site/urls", response_model=URLListResponse)
async def list_site_urls(req: URLListRequest) -> URLListResponse:
    """
    Enumerate all URLs for a given domain/homepage:
      1) Try sitemap.xml (including nested sitemap indexes)
      2) Fallback to Crawl4AI crawl (limit=max_urls), attempt to extract URLs from raw response
    Returns total count and list of URLs (up to max_urls).
    """
    try:
        url_str = str(req.url).strip()
        if not url_str.startswith(("http://", "https://")):
            url_str = "https://" + url_str
        parsed = urlparse(url_str)
        root_host = parsed.netloc or parsed.path
        
        # 1) Sitemap pass
        try:
            sm_urls = await _enumerate_sitemap_urls(url_str, max_urls=req.max_urls)
        except Exception:
            sm_urls = []
        
        if sm_urls:
            return URLListResponse(root=url_str, count=len(sm_urls), urls=sm_urls, source="sitemap")
        
        # 2) Crawl fallback
        try:
            pages, raw = await crawl_markdown(url_str, limit=min(req.max_urls, 500))
            extracted = _extract_urls_from_crawl4ai_raw(raw if isinstance(raw, dict) else {}, root_host, req.max_urls)
            
            # Fallback: collect URLs directly from normalized pages list if present
            if not extracted and isinstance(pages, list):
                try:
                    page_urls: list[str] = []
                    seen: set[str] = set()
                    for p in pages:
                        if isinstance(p, dict):
                            u = p.get("url")
                            if isinstance(u, str) and u.startswith("http"):
                                vp = urlparse(u)
                                if (vp.netloc or vp.path).endswith(root_host) and u not in seen:
                                    seen.add(u)
                                    page_urls.append(u)
                                    if len(page_urls) >= req.max_urls:
                                        break
                    extracted = page_urls
                except Exception:
                    pass
            
            if extracted:
                return URLListResponse(root=url_str, count=len(extracted), urls=extracted, source="crawl")
            # If we can't extract URLs, at least return a count based on page docs
            return URLListResponse(root=url_str, count=len(pages), urls=[], source="crawl")
        except Crawl4AINotConfigured as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"URL enumeration failed: {e}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"URL listing failed: {e}")
    
@router.post("/scan/batch")
async def scan_batch(req: dict):
    """
    Batch page-level processing for depth selector.
    Body: { "url": str, "max_pages": int }
    Returns summary counts and small sample.
    """
    try:
        url_str = str(req.get("url"))
        if not url_str.startswith(("http://", "https://")):
            url_str = "https://" + url_str
        max_pages = int(req.get("max_pages") or 40)

        try:
            urls = await _enumerate_sitemap_urls(url_str, max_urls=max_pages if max_pages > 0 else 500)
            if not urls:
                urls = [url_str]
            else:
                urls = urls[:max_pages]
        except Exception:
            urls = [url_str]

        processed = 0
        chunks_ok = 0
        nap_ok = 0
        errors: list[str] = []
        samples: list[dict] = []
        for u in urls:
            try:
                md, _ = await scrape_markdown(u)
                chunks = generate_content_chunks(md, max_chunks=6)
                if chunks:
                    chunks_ok += 1
                nap = extract_nap_json(md)
                if isinstance(nap, dict):
                    nap_ok += 1
                processed += 1
                if len(samples) < 3:
                    samples.append({"url": u, "chunks_preview": chunks[:2], "nap": nap})
            except Exception as e:
                errors.append(f"{u}: {e}")

        return {
            "root": url_str,
            "total_discovered": len(urls),
            "processed": processed,
            "chunks_ok": chunks_ok,
            "nap_ok": nap_ok,
            "errors_count": len(errors),
            "errors": errors[:10],
            "sample": samples,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Batch scan failed: {e}")
    
@router.post("/analysis/competitor-search", response_model=CompetitorSearchResponse)
async def competitor_search(req: CompetitorSearchRequest) -> CompetitorSearchResponse:
    """
    Find competitors using LLM-based Google Search grounding.
    Fallback: SERP (DuckDuckGo HTML) when grounded returns none.
    """
    try:
        # Try Gemini with Google Search grounding first
        # Note: This requires Vertex AI and will fail with regular Gemini API
        comps = []
        sq = []
        cites = []
        
        try:
            result = search_competitors_grounded(
                query=req.query,
                domain=str(req.domain),
                max_results=req.max_results,
                company_profile=req.company_profile
            )
            comps = result.get("competitors", [])
            sq = result.get("search_queries", [])
            cites = result.get("citations", [])
        except Exception as e:
            # Gemini grounding failed (e.g., not using Vertex AI)
            # Fall through to SERP fallback
            pass

        # Fallback via SERP if grounded yields no competitors
        if not comps:
            try:
                timeout = httpx.Timeout(10.0)
                async with httpx.AsyncClient(
                    timeout=timeout,
                    headers={"User-Agent": DEFAULT_USER_AGENT},
                    follow_redirects=True,
                ) as client:
                    # Use DuckDuckGo HTML endpoint for simple parsing
                    q = (req.query or str(req.domain)).strip()
                    q_s = quote_plus(q)
                    ddg_url = f"https://duckduckgo.com/html/?q={q_s}"
                    r = await client.get(ddg_url)
                    html = r.text or ""

                soup = BeautifulSoup(html, "html.parser")
                items: list[dict[str, str]] = []

                # DuckDuckGo HTML typically uses 'a.result__a' for result links
                for a in soup.select("a.result__a"):
                    href = a.get("href") or ""
                    if not href.startswith("http"):
                        continue
                    host = urlparse(href).netloc or ""
                    root_host = urlparse(f"https://{str(req.domain)}").netloc or str(req.domain)
                    # Skip self-domain
                    if host and root_host and (host.endswith(root_host) or root_host.endswith(host)):
                        continue
                    title = (a.get_text(strip=True) or host)
                    # Try to extract a nearby snippet
                    desc = ""
                    body = a.find_parent("div", class_="result__body")
                    if body:
                        sn = body.select_one(".result__snippet")
                        if sn:
                            desc = sn.get_text(" ", strip=True) or ""
                    items.append({
                        "name": title,
                        "url": href,
                        "description": desc or "SERP fallback result",
                        "relevance": "SERP fallback",
                    })
                    if len(items) >= (req.max_results or 5):
                        break

                if items:
                    comps = items
                    sq = [q]
            except Exception:
                # Keep empty if SERP fetch fails
                pass

            # Second fallback: Bing HTML (simple parse)
            if not comps:
                try:
                    timeout = httpx.Timeout(10.0)
                    async with httpx.AsyncClient(
                        timeout=timeout,
                        headers={"User-Agent": DEFAULT_USER_AGENT},
                        follow_redirects=True,
                    ) as client:
                        bq = (req.query or str(req.domain)).strip()
                        bq_s = quote_plus(bq)
                        bing_url = f"https://www.bing.com/search?q={bq_s}"
                        rb = await client.get(bing_url)
                        bhtml = rb.text or ""

                    bsoup = BeautifulSoup(bhtml, "html.parser")
                    bitems: list[dict[str, str]] = []

                    # Bing: results typically under li.b_algo h2 a
                    for a in bsoup.select("li.b_algo h2 a"):
                        href = a.get("href") or ""
                        if not href.startswith("http"):
                            continue
                        host = urlparse(href).netloc or ""
                        root_host = urlparse(f"https://{str(req.domain)}").netloc or str(req.domain)
                        # Skip self-domain
                        if host and root_host and (host.endswith(root_host) or root_host.endswith(host)):
                            continue
                        title = (a.get_text(strip=True) or host)
                        # Try to extract a nearby snippet
                        parent_li = a.find_parent("li")
                        desc = ""
                        if parent_li:
                            sn = parent_li.select_one("p")
                            if sn:
                                desc = sn.get_text(" ", strip=True) or ""
                        bitems.append({
                            "name": title,
                            "url": href,
                            "description": desc or "SERP fallback (Bing)",
                            "relevance": "SERP fallback",
                        })
                        if len(bitems) >= (req.max_results or 5):
                            break

                    if bitems:
                        comps = bitems
                        sq = [bq]
                except Exception:
                    # Keep empty if fallback fetch fails
                    pass

        return CompetitorSearchResponse(
            competitors=comps,
            search_queries=sq,
            citations=cites,
        )
    except GeminiNotConfigured as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Competitor search failed: {e}")


@router.post("/analysis/grounded-competitor-analysis", response_model=GroundedAnalysisResponse)
async def grounded_analysis(req: GroundedAnalysisRequest) -> GroundedAnalysisResponse:
    """
    Perform comprehensive competitor analysis using Google Search grounding.
    Returns detailed analysis with inline citations and sources.
    """
    try:
        result = grounded_competitor_analysis(
            domain=str(req.domain),
            topic=req.topic
        )
        return GroundedAnalysisResponse(
            summary=result["summary"],
            search_queries=result["search_queries"],
            sources=result["sources"]
        )
    except GeminiNotConfigured as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Grounded analysis failed: {e}")


# AI Visibility Analysis with Reasoning
@router.post("/analysis/ai-visibility", response_model=AIVisibilityResponse)
async def analyze_ai_visibility_endpoint(request: AIVisibilityRequest):
    """
    Analyze AI visibility for a domain/brand across AI platforms (ChatGPT, Claude, Perplexity, Gemini).
    Returns visibility scores WITH DETAILED REASONING for each platform.
    
    Visibility levels:
    - 0: Domain/brand NOT mentioned by AI
    - 1: Domain/brand mentioned peripherally  
    - 2: Domain/brand clearly recommended / primarily mentioned
    """
    from app.services.gemini_service import analyze_ai_visibility
    
    # Extract domain from URL
    from urllib.parse import urlparse
    parsed = urlparse(str(request.url))
    domain = parsed.netloc or parsed.path
    
    result = analyze_ai_visibility(
        domain=domain,
        brand_name=request.brand_name,
        keywords=request.keywords,
        competitors=request.competitors or []
    )
    
    return AIVisibilityResponse(**result)


@router.post("/analysis/ai-visibility-full")
async def ai_visibility_full_analysis(req: dict):
    """
    Full AI Visibility Analysis with two layers:
    1. Ungrounded Visibility - Does the LLM know this brand without context?
    2. Grounded Visibility - Can the LLM answer questions using website content?
    
    Combined into a final AI Visibility Score.
    
    Body: {
        "url": str,
        "company_name": str (optional, extracted if not provided),
        "industry": str (optional),
        "location": str (optional)
    }
    """
    try:
        url = req.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="URL required")
        
        # First, run comprehensive analysis to get company profile
        base_url = str(url).rstrip("/")
        parsed = urlparse(base_url)
        hostname = parsed.netloc
        scheme = parsed.scheme or "https"
        
        # Handle www variants
        if hostname.startswith("www."):
            hostname_alt = hostname[4:]
        else:
            hostname_alt = f"www.{hostname}"
        
        bases = [f"{scheme}://{hostname}", f"{scheme}://{hostname_alt}"]
        
        # Collect content
        all_content = []
        for base in bases:
            for path in ["", "/impressum", "/kontakt", "/about"]:
                if len(all_content) >= 4:
                    break
                page_url = f"{base}{path}"
                try:
                    md, _ = await scrape_markdown(page_url)
                    if md and len(md.strip()) > 200:
                        all_content.append(md[:10000])
                except Exception:
                    continue
            if len(all_content) >= 4:
                break
        
        if not all_content:
            raise HTTPException(status_code=400, detail="Could not scrape content")
        
        combined = "\n\n".join(all_content)[:40000]
        
        # Get comprehensive profile
        company_profile = analyze_page_comprehensive(combined, base_url)
        
        # Extract info
        company_name = req.get("company_name") or company_profile.get("business", {}).get("name", hostname)
        industry = req.get("industry") or company_profile.get("content", {}).get("industry", "general")
        location = req.get("location") or ""
        services = company_profile.get("entities", {}).get("products", [])
        
        # Generate user questions
        user_questions = generate_user_questions(company_profile, industry, location)
        
        # Run Ungrounded Visibility Test
        ungrounded_result = ai_visibility_ungrounded(
            company_name=company_name,
            industry=industry,
            location=location,
            services=services
        )
        
        # Run Grounded Visibility Test
        grounded_result = ai_visibility_grounded(
            company_profile=company_profile,
            test_questions=user_questions
        )
        
        # Calculate final score
        visibility_score = calculate_ai_visibility_score(ungrounded_result, grounded_result)
        
        return {
            "company_name": company_name,
            "industry": industry,
            "location": location,
            "user_questions": user_questions,
            "ungrounded": ungrounded_result,
            "grounded": grounded_result,
            "visibility_score": visibility_score,
            "company_profile_summary": {
                "business": company_profile.get("business", {}),
                "content": company_profile.get("content", {}),
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI Visibility analysis failed: {e}")


@router.post("/analysis/user-questions")
async def generate_user_questions_endpoint(req: dict):
    """
    Generate intelligent user questions that potential customers might ask.
    Uses company profile to create contextually relevant questions.
    
    Body: {
        "url": str,
        "industry": str (optional),
        "location": str (optional)
    }
    """
    try:
        url = req.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="URL required")
        
        # Get comprehensive profile first
        base_url = str(url).rstrip("/")
        
        # Scrape content
        md, _ = await scrape_markdown(base_url)
        if not md:
            raise HTTPException(status_code=400, detail="Could not scrape content")
        
        # Get profile
        company_profile = analyze_page_comprehensive(md[:30000], base_url)
        
        industry = req.get("industry") or company_profile.get("content", {}).get("industry", "general")
        location = req.get("location") or ""
        
        # Generate questions
        questions = generate_user_questions(company_profile, industry, location)
        
        return {
            "questions": questions,
            "industry": industry,
            "company_name": company_profile.get("business", {}).get("name"),
            "primary_topic": company_profile.get("content", {}).get("primaryTopic")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Question generation failed: {e}")
