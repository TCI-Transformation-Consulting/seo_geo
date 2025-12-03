from __future__ import annotations

import json
import os
from typing import Any, Dict, List

try:
    # New Google GenAI SDK
    from google import genai  # type: ignore
except Exception:  # pragma: no cover
    genai = None  # type: ignore


class GeminiNotConfigured(RuntimeError):
    pass


def _get_client() -> "genai.Client":
    """
    Create a Gemini client using GEMINI_API_KEY from environment.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise GeminiNotConfigured("GEMINI_API_KEY is not set. Please set it in backend/.env.")
    if genai is None:
        raise GeminiNotConfigured(
            "google-genai is not installed. Ensure 'google-genai' exists in backend/requirements.txt and install."
        )
    return genai.Client(api_key=api_key)


def generate_content_chunks(markdown: str, max_chunks: int = 20) -> List[Dict[str, str]]:
    """
    Take markdown content and return a list of chunks:
    [{ 'question': 'H2 style headline as a question', 'answer': 'Direct answer <= 50 words' }, ...]
    """
    client = _get_client()

    system_instruction = (
        "Du bist ein strukturierender Editor. Nimm Markdown-Inhalt und extrahiere Themenblöcke. "
        "Formatiere als JSON-Liste von Objekten mit den Feldern: "
        "'question' (H2/Frage) und 'answer' (direkte, präzise Antwort, maximal 50 Wörter). "
        "Keine Erklärtexte, nur JSON liefern."
    )

    contents = (
        "Markdown-Inhalt folgt. Extrahiere zentrale Themen als Fragen (H2-Stil) mit kurzer Antwort.\n\n"
        f"{markdown}"
    )

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=contents,
        config={
            "system_instruction": system_instruction,
            "response_mime_type": "application/json",
        },
    )

    raw = response.text or "[]"
    try:
        data: Any = json.loads(raw)
    except Exception:
        data = []

    chunks: List[Dict[str, str]] = []
    if isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                continue
            q = (item.get("question") or item.get("heading") or item.get("h2") or "").strip()
            a = (item.get("answer") or item.get("summary") or item.get("body") or "").strip()
            if q or a:
                chunks.append({"question": q, "answer": a})

    if max_chunks and max_chunks > 0:
        chunks = chunks[:max_chunks]

    return chunks


def extract_questions(markdown: str, max_items: int = 50) -> List[Dict[str, str]]:
    """
    Extract implicit user questions from markdown and (optionally) a simple cluster label.
    Returns a list of {'question': str, 'cluster': str?}.
    """
    client = _get_client()

    system_instruction = (
        "Extrahiere aus dem gegebenen Markdown alle impliziten Nutzerfragen. "
        "Gruppiere sie optional thematisch (cluster). "
        "Gib NUR JSON zurück: eine Liste von Objekten mit Feldern "
        "'question' (string) und optional 'cluster' (string)."
    )

    contents = (
        "Markdown folgt. Extrahiere Nutzerfragen und gruppiere optional thematisch. "
        "Nur JSON antworten.\n\n"
        f"{markdown}"
    )

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=contents,
        config={
            "system_instruction": system_instruction,
            "response_mime_type": "application/json",
        },
    )

    raw = response.text or "[]"
    try:
        data: Any = json.loads(raw)
    except Exception:
        data = []

    items: List[Dict[str, str]] = []
    if isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                continue
            q = (item.get("question") or item.get("frage") or "").strip()
            c = (item.get("cluster") or item.get("topic") or item.get("category") or "").strip()
            entry: Dict[str, str] = {"question": q}
            if c:
                entry["cluster"] = c
            if q:
                items.append(entry)

    if max_items and max_items > 0:
        items = items[:max_items]

    return items


def generate_review_reply(review_text: str) -> str:
    """
    Generate a friendly, concise support reply to a given review text.
    Returns plain text (no markdown, no JSON).
    """
    client = _get_client()

    system_instruction = (
        "Du bist ein freundlicher, hilfreicher Support-Agent. "
        "Antworte knapp (maximal 120 Wörter), empathisch und lösungsorientiert. "
        "Kein Marketing, kein Jargon. Nutze klare, einfache Sätze. "
        "Wenn nötig, biete einen nächsten konkreten Schritt an."
    )

    contents = (
        "Erzeuge eine kurze, freundliche Antwort auf folgende Bewertung:\n\n"
        f"{review_text}"
    )

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=contents,
        config={
            "system_instruction": system_instruction,
            "response_mime_type": "text/plain",
        },
    )

    return (response.text or "").strip()


def semantic_coverage_analysis(my_markdown: str, competitor_markdown_map: Dict[str, str]) -> List[Dict[str, Any]]:
    """
    Perform a semantic coverage / gap analysis between 'my_markdown' and competitors.
    Returns a JSON-serializable list of gap items:
    [{ "topic": str, "suggested_h2": str, "suggested_paragraph": str, "references": [{"competitor": str, "page": str}] }, ...]
    """
    client = _get_client()

    system_instruction = (
        "Du bist ein GEO/SEO-Analyst. Vergleiche MEINEN Content mit mehreren Wettbewerbern. "
        "Identifiziere Themen, die bei MIR fehlen oder zu dünn sind. "
        "Liefere NUR JSON (Liste von Objekten) mit Feldern: "
        "'topic' (string), 'suggested_h2' (string), 'suggested_paragraph' (string, ~60 Wörter), "
        "'references' (Liste von Objekten mit 'competitor' und optional 'page'). "
        "Keine Erklärtexte, keine zusätzlichen Felder."
    )

    # Compose a single long prompt with clearly separated sections
    comp_sections = []
    for comp_label, md in competitor_markdown_map.items():
        comp_sections.append(f"### COMPETITOR: {comp_label}\n{md}")

    comp_joined = "\n\n".join(comp_sections)
    contents = (
        "## MEIN CONTENT (Markdown)\n"
        f"{my_markdown}\n\n"
        "## WETTBEWERBER (Markdown)\n"
        f"{comp_joined}\n\n"
        "AUFGABE: Finde konkrete Lücken (Gap-Analyse) wie beschrieben. Antworte NUR mit JSON."
    )

    response = client.models.generate_content(
        model="gemini-2.5-pro",
        contents=contents,
        config={
            "system_instruction": system_instruction,
            "response_mime_type": "application/json",
        },
    )

    raw = response.text or "[]"
    try:
        data: Any = json.loads(raw)
    except Exception:
        data = []

    items: List[Dict[str, Any]] = []
    if isinstance(data, list):
        for it in data:
            if not isinstance(it, dict):
                continue
            topic = (it.get("topic") or "").strip()
            h2 = (it.get("suggested_h2") or it.get("h2") or "").strip()
            para = (it.get("suggested_paragraph") or it.get("paragraph") or it.get("answer") or "").strip()
            refs_in = it.get("references") or []
            refs: List[Dict[str, str]] = []
            if isinstance(refs_in, list):
                for r in refs_in:
                    if not isinstance(r, dict):
                        continue
                    competitor = (r.get("competitor") or r.get("source") or "").strip()
                    page = (r.get("page") or r.get("url") or "").strip()
                    entry: Dict[str, str] = {"competitor": competitor}
                    if page:
                        entry["page"] = page
                    if competitor or page:
                        refs.append(entry)
            obj: Dict[str, Any] = {
                "topic": topic,
                "missing": True,
                "suggested_h2": h2,
                "suggested_paragraph": para,
                "references": refs,
            }
            if topic or h2 or para:
                items.append(obj)

    return items


def generate_jsonld(schema_type: str, markdown: str) -> str:
    """
    Generate JSON-LD (Schema.org) for the given schema_type from provided markdown.
    Returns the raw JSON (no backticks, no explanations).
    Allowed schema_type: Organization | Product | FAQ | HowTo | Article
    """
    client = _get_client()

    system_instruction = (
        "Du bist ein Senior SEO & Data Engineer. "
        "Erzeuge valides Schema.org JSON-LD für den gewünschten Typ. "
        "Nutze den gegebenen Markdown-Kontext, ziehe echte Werte vor Heuristiken. "
        "Antworte NUR mit JSON (kein <script>-Tag, keine Backticks)."
    )

    contents = (
        f"SCHEMA-TYP: {schema_type}\n\n"
        "KONTEXT (Markdown):\n"
        f"{markdown}\n\n"
        "AUFGABE: Erzeuge valides JSON-LD (nur JSON-Ausgabe)."
    )

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=contents,
        config={
            "system_instruction": system_instruction,
            "response_mime_type": "application/json",
        },
    )

    return (response.text or "").strip()


def extract_nap_json(markdown: str) -> Dict[str, Any]:
    """
    Extract Name, Address, Phone as structured JSON from markdown.
    Returns a dict with keys: name, address, phone (values may be None if missing).
    """
    client = _get_client()

    system_instruction = (
        "Extrahiere Name (Unternehmensname), Adresse und Telefonnummer aus dem gegebenen Markdown. "
        "Antworte NUR als JSON-Objekt mit den Feldern 'name', 'address', 'phone'. "
        "Wenn ein Feld fehlt, setze es auf null."
    )

    contents = (
        "Markdown folgt. Extrahiere NAP und gib nur JSON zurück.\n\n"
        f"{markdown}"
    )

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=contents,
        config={
            "system_instruction": system_instruction,
            "response_mime_type": "application/json",
        },
    )

    raw = response.text or "{}"
    try:
        data: Any = json.loads(raw)
    except Exception:
        data = {}

    name = data.get("name") if isinstance(data, dict) else None
    address = data.get("address") if isinstance(data, dict) else None
    phone = data.get("phone") if isinstance(data, dict) else None

    return {"name": name, "address": address, "phone": phone}


def fact_check_claim(claim: str, context_markdown: str) -> Dict[str, Any]:
    """
    Fact-check a single claim against the provided markdown context.
    Returns: {'verdict': 'true'|'false'|'uncertain', 'evidence': [{'citation': str, 'snippet': str}, ...]}
    """
    client = _get_client()

    system_instruction = (
        "Du bist ein strenger Faktenprüfer. "
        "Nutze AUSSCHLIESSLICH den gegebenen Kontext. "
        "Antworte NUR als JSON-Objekt mit Feldern: "
        "'verdict' (\"true\" | \"false\" | \"uncertain\") und "
        "'evidence' (Liste von Objekten mit 'citation' und 'snippet')."
    )

    contents = (
        "KONTEXT (Markdown, mit Quellenhinweisen innerhalb des Textes falls vorhanden):\n\n"
        f"{context_markdown}\n\n"
        "AUSSAGE ZUM PRÜFEN:\n"
        f"{claim}\n\n"
        "AUFGABE: Prüfe die Aussage nur anhand des Kontexts. Antworte NUR mit JSON."
    )

    response = client.models.generate_content(
        model="gemini-2.5-pro",
        contents=contents,
        config={
            "system_instruction": system_instruction,
            "response_mime_type": "application/json",
        },
    )

    raw = response.text or "{}"
    try:
        data: Any = json.loads(raw)
    except Exception:
        data = {}

    verdict = data.get("verdict") if isinstance(data, dict) else None
    evidence_in = data.get("evidence") if isinstance(data, dict) else None
    evidence: List[Dict[str, str]] = []
    if isinstance(evidence_in, list):
        for e in evidence_in:
            if not isinstance(e, dict):
                continue
            citation = (e.get("citation") or "").strip()
            snippet = (e.get("snippet") or "").strip()
            evidence.append({"citation": citation, "snippet": snippet})

    if verdict not in {"true", "false", "uncertain"}:
        verdict = "uncertain"

    return {"verdict": verdict, "evidence": evidence}


def search_competitors_grounded(query: str, domain: str, max_results: int = 10) -> Dict[str, Any]:
    """
    Use Gemini with Google Search grounding to find competitors for a given domain/topic.
    Returns grounded results with citations from real web sources.
    
    Returns: {
        "competitors": [{"name": str, "url": str, "description": str, "relevance": str}],
        "search_queries": [str],
        "citations": [{"title": str, "url": str}]
    }
    """
    client = _get_client()
    
    try:
        from google.genai import types
    except ImportError:
        raise GeminiNotConfigured("google-genai types not available for grounding")
    
    grounding_tool = types.Tool(
        google_search=types.GoogleSearch()
    )
    
    system_instruction = (
        "Du bist ein Markt- und Wettbewerbsanalyst. "
        "Suche nach den wichtigsten Wettbewerbern für die gegebene Domain und das Thema. "
        "Nutze die Google-Suche, um aktuelle und relevante Wettbewerber zu finden. "
        "Antworte NUR als JSON-Objekt mit dem Feld 'competitors' (Liste von Objekten mit "
        "'name' (Firmenname), 'url' (Website-URL), 'description' (kurze Beschreibung), "
        "'relevance' (warum relevant als Wettbewerber)). "
        "Maximal " + str(max_results) + " Wettbewerber."
    )
    
    contents = (
        f"Finde die wichtigsten Wettbewerber für folgende Website:\n"
        f"Domain: {domain}\n"
        f"Suchkontext: {query}\n\n"
        f"Suche nach direkten Wettbewerbern, die ähnliche Produkte/Dienstleistungen anbieten. "
        f"Nutze die Google-Suche um aktuelle Informationen zu finden."
    )
    
    config = types.GenerateContentConfig(
        tools=[grounding_tool],
        system_instruction=system_instruction,
    )
    
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents,
        config=config,
    )
    
    # Parse the response
    raw = response.text or "{}"
    try:
        data: Any = json.loads(raw)
    except Exception:
        data = {}
    
    competitors = []
    if isinstance(data, dict) and "competitors" in data:
        for comp in data.get("competitors", []):
            if isinstance(comp, dict):
                competitors.append({
                    "name": (comp.get("name") or "").strip(),
                    "url": (comp.get("url") or "").strip(),
                    "description": (comp.get("description") or "").strip(),
                    "relevance": (comp.get("relevance") or "").strip(),
                })
    
    search_queries = []
    citations = []
    
    if hasattr(response, 'candidates') and response.candidates:
        candidate = response.candidates[0]
        if hasattr(candidate, 'grounding_metadata') and candidate.grounding_metadata:
            gm = candidate.grounding_metadata
            
            # Get search queries used
            if hasattr(gm, 'web_search_queries') and gm.web_search_queries:
                search_queries = list(gm.web_search_queries)
            
            # Get grounding chunks (citations)
            if hasattr(gm, 'grounding_chunks') and gm.grounding_chunks:
                for chunk in gm.grounding_chunks:
                    if hasattr(chunk, 'web') and chunk.web:
                        citations.append({
                            "title": getattr(chunk.web, 'title', '') or '',
                            "url": getattr(chunk.web, 'uri', '') or '',
                        })
    
    return {
        "competitors": competitors[:max_results],
        "search_queries": search_queries,
        "citations": citations,
    }


def add_citations_to_text(response) -> str:
    """
    Take a Gemini response with grounding metadata and return text with inline citations.
    Citations are added as markdown links [1](url) after the relevant text segments.
    """
    text = response.text or ""
    
    if not hasattr(response, 'candidates') or not response.candidates:
        return text
    
    candidate = response.candidates[0]
    if not hasattr(candidate, 'grounding_metadata') or not candidate.grounding_metadata:
        return text
    
    gm = candidate.grounding_metadata
    
    if not hasattr(gm, 'grounding_supports') or not gm.grounding_supports:
        return text
    if not hasattr(gm, 'grounding_chunks') or not gm.grounding_chunks:
        return text
    
    supports = gm.grounding_supports
    chunks = gm.grounding_chunks
    
    # Sort supports by end_index in descending order to avoid shifting issues when inserting
    sorted_supports = sorted(
        supports, 
        key=lambda s: getattr(getattr(s, 'segment', None), 'end_index', 0) if hasattr(s, 'segment') else 0, 
        reverse=True
    )
    
    for support in sorted_supports:
        if not hasattr(support, 'segment') or not support.segment:
            continue
        
        end_index = getattr(support.segment, 'end_index', None)
        if end_index is None:
            continue
        
        chunk_indices = getattr(support, 'grounding_chunk_indices', []) or []
        if not chunk_indices:
            continue
        
        # Create citation string like [1](link1)[2](link2)
        citation_links = []
        for i in chunk_indices:
            if i < len(chunks):
                chunk = chunks[i]
                if hasattr(chunk, 'web') and chunk.web:
                    uri = getattr(chunk.web, 'uri', '') or ''
                    if uri:
                        citation_links.append(f"[{i + 1}]({uri})")
        
        if citation_links:
            citation_string = " " + ", ".join(citation_links)
            text = text[:end_index] + citation_string + text[end_index:]
    
    return text


def grounded_competitor_analysis(domain: str, topic: str) -> Dict[str, Any]:
    """
    Perform a comprehensive grounded competitor analysis using Google Search.
    Returns detailed analysis with real-time web data and citations.
    
    Returns: {
        "summary": str (with inline citations),
        "competitors": [...],
        "market_insights": str,
        "search_queries": [str],
        "sources": [{"title": str, "url": str}]
    }
    """
    client = _get_client()
    
    try:
        from google.genai import types
    except ImportError:
        raise GeminiNotConfigured("google-genai types not available for grounding")
    
    grounding_tool = types.Tool(
        google_search=types.GoogleSearch()
    )
    
    system_instruction = (
        "Du bist ein erfahrener Marktanalyst. Führe eine umfassende Wettbewerbsanalyse durch. "
        "Nutze die Google-Suche um aktuelle Informationen über Wettbewerber zu finden. "
        "Sei faktisch und zitiere deine Quellen."
    )
    
    contents = (
        f"Führe eine Wettbewerbsanalyse für folgende Website durch:\n"
        f"Domain: {domain}\n"
        f"Branche/Thema: {topic}\n\n"
        f"Bitte analysiere:\n"
        f"1. Wer sind die Hauptwettbewerber? (mit URLs)\n"
        f"2. Was sind deren Stärken und Schwächen?\n"
        f"3. Welche Markttrends sind erkennbar?\n"
        f"4. Welche Content-Strategien nutzen die Wettbewerber?\n\n"
        f"Nutze die Google-Suche für aktuelle Informationen."
    )
    
    config = types.GenerateContentConfig(
        tools=[grounding_tool],
        system_instruction=system_instruction,
    )
    
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents,
        config=config,
    )
    
    # Get text with inline citations
    summary_with_citations = add_citations_to_text(response)
    
    # Extract metadata
    search_queries = []
    sources = []
    
    if hasattr(response, 'candidates') and response.candidates:
        candidate = response.candidates[0]
        if hasattr(candidate, 'grounding_metadata') and candidate.grounding_metadata:
            gm = candidate.grounding_metadata
            
            if hasattr(gm, 'web_search_queries') and gm.web_search_queries:
                search_queries = list(gm.web_search_queries)
            
            if hasattr(gm, 'grounding_chunks') and gm.grounding_chunks:
                for chunk in gm.grounding_chunks:
                    if hasattr(chunk, 'web') and chunk.web:
                        sources.append({
                            "title": getattr(chunk.web, 'title', '') or '',
                            "url": getattr(chunk.web, 'uri', '') or '',
                        })
    
    return {
        "summary": summary_with_citations,
        "search_queries": search_queries,
        "sources": sources,
    }
