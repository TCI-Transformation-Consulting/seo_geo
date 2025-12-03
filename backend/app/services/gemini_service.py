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
    Extract Name, Address, Phone, Email as structured JSON from markdown.
    Returns a dict with keys: name, address, phone, email (values may be None if missing).
    """
    client = _get_client()

    system_instruction = (
        "Du bist ein Experte für die Extraktion von Geschäftsinformationen. "
        "Extrahiere folgende Informationen aus dem gegebenen Text:\n"
        "1. name: Der offizielle Unternehmensname/Firmenname (z.B. 'Neue Werte GmbH', 'Example Corp')\n"
        "2. address: Die vollständige Geschäftsadresse (Straße, PLZ, Stadt)\n"
        "3. phone: Die Telefonnummer (inkl. Vorwahl)\n"
        "4. email: Die Kontakt-E-Mail-Adresse\n\n"
        "Suche besonders in Impressum-Abschnitten, Kontaktbereichen, Footer-Texten.\n"
        "Antworte NUR als JSON-Objekt mit den Feldern 'name', 'address', 'phone', 'email'. "
        "Wenn ein Feld nicht gefunden wird, setze es auf null."
    )

    contents = (
        "Analysiere den folgenden Website-Inhalt und extrahiere die Geschäftsinformationen (NAP+E).\n"
        "Achte besonders auf Impressum, Kontakt, Footer-Bereiche.\n\n"
        f"WEBSITE-INHALT:\n{markdown}"
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
    email = data.get("email") if isinstance(data, dict) else None

    return {"name": name, "address": address, "phone": phone, "email": email}


def analyze_page_comprehensive(markdown: str, url: str) -> Dict[str, Any]:
    """
    Comprehensive LLM-based page analysis.
    Scrape → LLM Parse → Structured Data
    
    This function performs a single LLM call to extract multiple data points:
    - NAP (Name, Address, Phone, Email)
    - SEO elements (Title, Description, H1)
    - Content classification (Industry, Topic, Type)
    - Schema recommendations
    - Key entities and keywords
    
    Returns a structured dict with all extracted information.
    """
    client = _get_client()
    
    # Limit content size
    if len(markdown) > 30000:
        markdown = markdown[:30000]
    
    system_instruction = """Du bist ein Website-Analyse-Experte. Analysiere den gegebenen Website-Inhalt und extrahiere strukturierte Informationen.

Antworte NUR als JSON-Objekt mit folgender Struktur:
{
  "business": {
    "name": "Firmenname oder null",
    "legalForm": "GmbH, UG, AG, etc. oder null",
    "address": "Vollständige Adresse oder null",
    "phone": "Telefonnummer oder null",
    "email": "E-Mail-Adresse oder null",
    "website": "Website-URL",
    "foundOnPage": "Wo wurden die Infos gefunden (z.B. Impressum, Footer, Kontakt)"
  },
  "seo": {
    "title": "Seitentitel",
    "description": "Meta-Description oder Zusammenfassung",
    "h1": ["Liste der H1-Überschriften"],
    "h1Assessment": "gut/verbesserungswürdig/fehlt - mit Begründung",
    "keyMessages": ["Die 3-5 wichtigsten Botschaften der Seite"]
  },
  "content": {
    "primaryTopic": "Hauptthema der Seite",
    "secondaryTopics": ["Weitere Themen"],
    "industry": "Branche (z.B. Agentur, E-Commerce, Software, etc.)",
    "contentType": "Art des Inhalts (Unternehmensseite, Blog, Shop, etc.)",
    "targetAudience": "Zielgruppe",
    "tone": "Tonalität (professionell, locker, technisch, etc.)",
    "language": "Sprache der Seite"
  },
  "entities": {
    "people": [{"name": "Name", "role": "Rolle/Position"}],
    "organizations": ["Genannte Unternehmen/Organisationen"],
    "locations": ["Genannte Orte"],
    "products": ["Genannte Produkte/Services"],
    "keywords": ["Die 10 wichtigsten Keywords"]
  },
  "schema": {
    "detected": ["Erkannte Schema-Typen aus dem Content"],
    "recommended": ["Empfohlene Schema-Typen basierend auf dem Content"],
    "reasoning": "Begründung für die Empfehlungen"
  },
  "credibility": {
    "hasImpressum": true/false,
    "hasContact": true/false,
    "hasSocialProof": true/false,
    "trustSignals": ["Gefundene Vertrauenssignale"],
    "score": 0-100
  },
  "contentQuality": {
    "hasUniqueContent": true/false,
    "hasFAQ": true/false,
    "hasPricing": true/false,
    "hasTestimonials": true/false,
    "missingElements": ["Fehlende wichtige Elemente"],
    "score": 0-100
  }
}

Wichtig:
- Extrahiere nur Informationen, die tatsächlich im Text vorkommen
- Setze fehlende Felder auf null oder leere Arrays
- Sei präzise und faktisch
- Achte besonders auf Impressum, Kontakt und Footer-Bereiche für NAP-Daten"""

    contents = f"""Analysiere diese Website:
URL: {url}

WEBSITE-INHALT:
{markdown}

Extrahiere alle strukturierten Informationen gemäß dem Schema."""

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
        data = json.loads(raw)
    except Exception:
        data = {}
    
    return data if isinstance(data, dict) else {}


def validate_extracted_data(original_markdown: str, extracted_data: Dict[str, Any], data_type: str) -> Dict[str, Any]:
    """
    Validation LLM call to verify extracted data is correct.
    
    Args:
        original_markdown: The source content
        extracted_data: The data that was extracted
        data_type: Type of data being validated (e.g., "NAP", "SEO", "Content")
    
    Returns:
        {"valid": bool, "corrections": {...}, "confidence": float, "reasoning": str}
    """
    client = _get_client()
    
    # Limit content
    if len(original_markdown) > 15000:
        original_markdown = original_markdown[:15000]
    
    system_instruction = f"""Du bist ein Qualitätsprüfer für extrahierte Website-Daten.
Prüfe ob die extrahierten {data_type}-Daten korrekt sind.

Antworte NUR als JSON:
{{
  "valid": true/false,
  "corrections": {{}},  // Korrekturen falls nötig
  "confidence": 0.0-1.0,
  "reasoning": "Begründung"
}}"""

    contents = f"""EXTRAHIERTE DATEN ({data_type}):
{json.dumps(extracted_data, ensure_ascii=False, indent=2)}

ORIGINAL-INHALT:
{original_markdown}

Sind die extrahierten Daten korrekt? Gibt es Fehler oder fehlende Informationen?"""

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
        return json.loads(raw)
    except Exception:
        return {"valid": True, "corrections": {}, "confidence": 0.5, "reasoning": "Validation failed"}


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


def generate_user_questions(company_profile: Dict[str, Any], industry: str, location: str = "") -> List[str]:
    """
    Generate intelligent, relevant user questions that potential customers might ask
    about this business. These are questions an AI assistant should be able to answer.
    
    Args:
        company_profile: Extracted company data (name, services, etc.)
        industry: The business industry
        location: Optional location for local relevance
    
    Returns:
        List of 5-8 high-quality user questions
    """
    client = _get_client()
    
    company_name = company_profile.get("business", {}).get("name", "das Unternehmen")
    services = company_profile.get("entities", {}).get("products", [])
    target_audience = company_profile.get("content", {}).get("targetAudience", "")
    primary_topic = company_profile.get("content", {}).get("primaryTopic", "")
    
    system_instruction = """Du bist ein Experte für Nutzerverhalten und Suchanfragen.
Generiere realistische Fragen, die potenzielle Kunden an einen KI-Assistenten stellen würden,
wenn sie nach diesem Unternehmen oder seinen Dienstleistungen suchen.

Die Fragen sollten:
- Natürlich formuliert sein (wie echte Menschen fragen)
- Relevant für die Branche und Dienstleistungen sein
- Eine Mischung aus informationalen und transaktionalen Absichten haben
- Lokal relevant sein (wenn Standort angegeben)

Antworte NUR als JSON-Array mit 6-8 Fragen als Strings."""

    contents = f"""Generiere Nutzerfragen für:

UNTERNEHMEN: {company_name}
BRANCHE: {industry}
STANDORT: {location or "nicht angegeben"}
ZIELGRUPPE: {target_audience}
HAUPTTHEMA: {primary_topic}
DIENSTLEISTUNGEN/PRODUKTE: {', '.join(services[:5]) if services else 'nicht spezifiziert'}

Erstelle 6-8 realistische Fragen, die Nutzer an einen KI-Assistenten stellen könnten."""

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
        questions = json.loads(raw)
        if isinstance(questions, list):
            return [q for q in questions if isinstance(q, str) and len(q) > 10][:8]
    except Exception:
        pass
    
    return []


def ai_visibility_ungrounded(company_name: str, industry: str, location: str, services: List[str]) -> Dict[str, Any]:
    """
    Test UNGROUNDED AI Visibility - Does the LLM know this company without context?
    This measures the brand's presence in the LLM's trained knowledge.
    
    Returns:
        {
            "recalled": bool,
            "mention_type": "explicit" | "indirect" | "none",
            "score": 0-2,
            "context": str,
            "competitors_mentioned": [str],
            "reasoning": str
        }
    """
    client = _get_client()
    
    # Build industry-relevant query
    service_hint = services[0] if services else "Dienstleistungen"
    
    system_instruction = """Du bist ein neutraler Marktanalyst.
Beantworte die Frage basierend auf deinem Wissen.
Sei ehrlich - wenn du das Unternehmen nicht kennst, sage es.

Antworte als JSON:
{
  "mentioned_companies": ["Liste der genannten Unternehmen"],
  "target_company_mentioned": true/false,
  "mention_type": "explicit" | "indirect" | "none",
  "context": "In welchem Kontext wurde es erwähnt",
  "reasoning": "Begründung"
}"""

    # IMPROVED: Two-part test for more accurate knowledge detection
    
    # Part 1: Direct knowledge test
    direct_test = f"""Kennst du das Unternehmen "{company_name}"?
Falls ja, beschreibe kurz (max 2-3 Sätze):
- Was macht dieses Unternehmen?
- In welcher Branche ist es tätig?

Falls nein oder unsicher, sage es ehrlich."""

    direct_response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=direct_test,
        config={
            "system_instruction": """Du bist ein ehrlicher Assistent.
Wenn du ein Unternehmen nicht kennst oder unsicher bist, sage es klar.
Erfinde NICHTS.

Antworte als JSON:
{
  "known": true/false,
  "confidence": "high" | "low" | "none",
  "description": "Beschreibung falls bekannt" oder null,
  "source_assumption": "Warum du glaubst, es zu kennen oder nicht"
}""",
            "response_mime_type": "application/json",
        },
    )
    
    try:
        direct_data = json.loads(direct_response.text or "{}")
        is_known = direct_data.get("known", False)
        confidence = direct_data.get("confidence", "none")
    except:
        is_known = False
        confidence = "none"
    
    # Part 2: Competitive context test (only if NOT directly known with high confidence)
    # This tests if the brand appears in industry context
    contents = f"""Welche Unternehmen sind führend in der Branche "{industry}" im Bereich {service_hint}?
{f'Speziell in {location}?' if location else ''}

Nenne die wichtigsten Anbieter und erkläre kurz, warum sie relevant sind."""

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
        data = json.loads(raw)
    except Exception:
        data = {}
    
    # Check if company was mentioned
    mentioned = data.get("mentioned_companies", [])
    target_mentioned = data.get("target_company_mentioned", False)
    mention_type = data.get("mention_type", "none")
    
    # Also check mentioned list for company name
    if not target_mentioned and company_name:
        company_lower = company_name.lower()
        for m in mentioned:
            if isinstance(m, str) and company_lower in m.lower():
                target_mentioned = True
                mention_type = "explicit"
                break
    
    score = 0
    if mention_type == "explicit":
        score = 2
    elif mention_type == "indirect":
        score = 1
    
    return {
        "recalled": target_mentioned,
        "mention_type": mention_type,
        "score": score,
        "max_score": 2,
        "context": data.get("context", ""),
        "competitors_mentioned": [m for m in mentioned if isinstance(m, str)],
        "reasoning": data.get("reasoning", ""),
        "query_used": contents[:200]
    }


def ai_visibility_grounded(company_profile: Dict[str, Any], test_questions: List[str]) -> Dict[str, Any]:
    """
    Test GROUNDED AI Visibility - Can the LLM correctly answer questions using provided content?
    This measures if the website content supports AI answerability.
    
    Args:
        company_profile: The comprehensive analysis result
        test_questions: Questions to test answerability
    
    Returns:
        {
            "total_score": int,
            "max_score": int,
            "percentage": float,
            "results": [
                {
                    "question": str,
                    "answerable": bool,
                    "answer_quality": "complete" | "partial" | "none",
                    "score": 0-2,
                    "missing_info": str,
                    "answer_preview": str
                }
            ],
            "content_gaps": [str],
            "recommendations": [str]
        }
    """
    client = _get_client()
    
    # Build a content profile string
    business = company_profile.get("business", {})
    content = company_profile.get("content", {})
    entities = company_profile.get("entities", {})
    seo = company_profile.get("seo", {})
    
    profile_text = f"""
UNTERNEHMEN: {business.get('name', 'Unbekannt')}
RECHTSFORM: {business.get('legalForm', '')}
ADRESSE: {business.get('address', '')}
TELEFON: {business.get('phone', '')}
E-MAIL: {business.get('email', '')}

BRANCHE: {content.get('industry', '')}
HAUPTTHEMA: {content.get('primaryTopic', '')}
ZIELGRUPPE: {content.get('targetAudience', '')}

DIENSTLEISTUNGEN/PRODUKTE:
{chr(10).join('- ' + p for p in entities.get('products', [])[:10])}

KERNBOTSCHAFTEN:
{chr(10).join('- ' + m for m in seo.get('keyMessages', [])[:5])}

MITARBEITER:
{chr(10).join('- ' + p.get('name', '') + ' (' + p.get('role', '') + ')' for p in entities.get('people', [])[:5])}
"""

    results = []
    total_score = 0
    content_gaps = []
    
    for question in test_questions[:6]:  # Limit to 6 questions
        system_instruction = """Du bist ein KI-Assistent der Fragen über ein Unternehmen beantwortet.
Nutze AUSSCHLIESSLICH die bereitgestellten Informationen.
Erfinde NICHTS hinzu.

Antworte als JSON:
{
  "answerable": true/false,
  "answer_quality": "complete" | "partial" | "none",
  "answer": "Deine Antwort auf die Frage (max 100 Wörter)",
  "missing_info": "Was fehlt, um die Frage vollständig zu beantworten" oder null
}"""

        contents = f"""UNTERNEHMENSPROFIL:
{profile_text}

FRAGE: {question}

Beantworte diese Frage NUR mit den oben stehenden Informationen."""

        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=contents,
                config={
                    "system_instruction": system_instruction,
                    "response_mime_type": "application/json",
                },
            )
            
            raw = response.text or "{}"
            data = json.loads(raw)
            
            quality = data.get("answer_quality", "none")
            score = 2 if quality == "complete" else 1 if quality == "partial" else 0
            total_score += score
            
            if data.get("missing_info"):
                content_gaps.append(data["missing_info"])
            
            results.append({
                "question": question,
                "answerable": data.get("answerable", False),
                "answer_quality": quality,
                "score": score,
                "max_score": 2,
                "missing_info": data.get("missing_info"),
                "answer_preview": (data.get("answer", "")[:150] + "...") if data.get("answer") else None
            })
        except Exception as e:
            results.append({
                "question": question,
                "answerable": False,
                "answer_quality": "none",
                "score": 0,
                "max_score": 2,
                "missing_info": f"Error: {str(e)}",
                "answer_preview": None
            })
    
    max_score = len(results) * 2
    percentage = (total_score / max_score * 100) if max_score > 0 else 0
    
    # Generate recommendations
    recommendations = []
    unique_gaps = list(set(content_gaps))[:5]
    for gap in unique_gaps:
        recommendations.append(f"Add content about: {gap}")
    
    if percentage < 50:
        recommendations.append("Significantly expand website content to improve AI answerability")
    elif percentage < 75:
        recommendations.append("Add more detailed service descriptions and FAQs")
    
    return {
        "total_score": total_score,
        "max_score": max_score,
        "percentage": round(percentage, 1),
        "results": results,
        "content_gaps": unique_gaps,
        "recommendations": recommendations
    }


def calculate_ai_visibility_score(ungrounded: Dict[str, Any], grounded: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate the final AI Visibility Score combining both layers.
    
    Formula:
    AI Visibility Score = 40% Ungrounded Recall + 60% Grounded Answerability
    
    Returns:
        {
            "total_score": float (0-100),
            "ungrounded_score": float,
            "grounded_score": float,
            "grade": "A" | "B" | "C" | "D" | "F",
            "summary": str,
            "priority_actions": [str]
        }
    """
    # Ungrounded score (0-100)
    ungrounded_score = (ungrounded.get("score", 0) / ungrounded.get("max_score", 2)) * 100
    
    # Grounded score (0-100)
    grounded_score = grounded.get("percentage", 0)
    
    # Weighted total
    total_score = (0.4 * ungrounded_score) + (0.6 * grounded_score)
    
    # Grade
    if total_score >= 80:
        grade = "A"
        summary = "Excellent AI Visibility - Your brand is well-known and content supports AI answers"
    elif total_score >= 60:
        grade = "B"
        summary = "Good AI Visibility - Some improvements possible in content depth"
    elif total_score >= 40:
        grade = "C"
        summary = "Moderate AI Visibility - Significant content gaps affect discoverability"
    elif total_score >= 20:
        grade = "D"
        summary = "Poor AI Visibility - Major improvements needed for AI discoverability"
    else:
        grade = "F"
        summary = "Critical - Brand is not visible to AI systems"
    
    # Priority actions
    priority_actions = []
    
    if ungrounded_score < 50:
        priority_actions.append("Increase brand presence through PR, content marketing, and industry mentions")
    
    if grounded_score < 50:
        priority_actions.extend(grounded.get("recommendations", [])[:3])
    
    if not priority_actions:
        priority_actions.append("Maintain current visibility and monitor for changes")
    
    return {
        "total_score": round(total_score, 1),
        "ungrounded_score": round(ungrounded_score, 1),
        "grounded_score": round(grounded_score, 1),
        "ungrounded_weight": "40%",
        "grounded_weight": "60%",
        "grade": grade,
        "summary": summary,
        "priority_actions": priority_actions[:5]
    }


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


def analyze_ai_visibility(domain: str, brand_name: str, keywords: List[str], competitors: List[str] = None) -> Dict[str, Any]:
    """
    Analyze AI visibility for a domain/brand across different AI systems.
    Returns visibility scores with reasoning for each AI platform.
    
    Visibility levels:
    - 0: Domain/brand NOT mentioned
    - 1: Domain/brand mentioned peripherally
    - 2: Domain/brand clearly recommended / primarily mentioned
    """
    client = _get_client()
    
    # Prepare competitor context
    competitor_context = ""
    if competitors:
        competitor_context = f"\nWettbewerber zum Vergleich: {', '.join(competitors[:5])}"
    
    system_instruction = """Du bist ein AI-Visibility-Analyst. Du simulierst, wie verschiedene KI-Systeme 
(ChatGPT, Claude, Perplexity, Gemini) auf Suchanfragen zu bestimmten Keywords antworten würden.

Analysiere für jedes Keyword, ob und wie die angegebene Domain/Marke erwähnt werden würde.

Antworte NUR als JSON mit dieser Struktur:
{
  "overall_score": number (0-100),
  "overall_reasoning": string (Zusammenfassung der Visibility),
  "platforms": {
    "chatgpt": {
      "score": number (0, 1, oder 2),
      "reasoning": string (Begründung warum dieses Level),
      "would_mention": boolean,
      "mention_context": string (wie würde die Erwähnung aussehen)
    },
    "claude": { ... gleiche Struktur ... },
    "perplexity": { ... gleiche Struktur ... },
    "gemini": { ... gleiche Struktur ... }
  },
  "keyword_analysis": [
    {
      "keyword": string,
      "visibility_score": number (0-2),
      "reasoning": string,
      "improvement_suggestions": [string]
    }
  ],
  "competitor_comparison": {
    "our_position": string (leading/competitive/behind),
    "reasoning": string,
    "competitors_ahead": [string],
    "competitors_behind": [string]
  },
  "improvement_recommendations": [
    {
      "priority": string (critical/high/medium/low),
      "action": string,
      "expected_impact": string,
      "reasoning": string
    }
  ]
}"""

    contents = f"""Analysiere die KI-Visibility für:

Domain: {domain}
Markenname: {brand_name}
Keywords: {', '.join(keywords)}{competitor_context}

Für jede KI-Plattform (ChatGPT, Claude, Perplexity, Gemini):
1. Würde diese KI bei den Keywords die Domain/Marke empfehlen?
2. Wenn ja, wie prominent (0=nicht, 1=nebenbei, 2=Hauptempfehlung)?
3. BEGRÜNDE JEDE EINSCHÄTZUNG - warum würde die KI so antworten?

Berücksichtige:
- Bekanntheitsgrad der Domain
- Qualität und Tiefe des Contents
- Vorhandene strukturierte Daten
- Online-Präsenz und Verlinkungen
- Relevanz für die Keywords

Antworte nur mit dem JSON-Objekt."""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config={
                "system_instruction": system_instruction,
                "response_mime_type": "application/json",
            },
        )
        
        raw = response.text or "{}"
        try:
            data = json.loads(raw)
        except Exception:
            data = {}
        
        # Ensure proper structure
        result = {
            "domain": domain,
            "brand_name": brand_name,
            "keywords": keywords,
            "overall_score": data.get("overall_score", 0),
            "overall_reasoning": data.get("overall_reasoning", "Analyse nicht verfügbar"),
            "platforms": data.get("platforms", {}),
            "keyword_analysis": data.get("keyword_analysis", []),
            "competitor_comparison": data.get("competitor_comparison", {}),
            "improvement_recommendations": data.get("improvement_recommendations", []),
        }
        
        return result
        
    except Exception as e:
        return {
            "domain": domain,
            "brand_name": brand_name,
            "keywords": keywords,
            "overall_score": 0,
            "overall_reasoning": f"Fehler bei der Analyse: {str(e)}",
            "platforms": {},
            "keyword_analysis": [],
            "competitor_comparison": {},
            "improvement_recommendations": [],
            "error": str(e)
        }
