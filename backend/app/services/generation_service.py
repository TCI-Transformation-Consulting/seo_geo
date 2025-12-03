from __future__ import annotations

import os
from typing import Any

try:
    # Google GenAI SDK
    from google import genai  # type: ignore
except Exception:  # pragma: no cover
    genai = None  # type: ignore


class GeminiNotConfigured(RuntimeError):
    pass


def _get_client() -> "genai.Client":
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise GeminiNotConfigured("GEMINI_API_KEY is not set. Please set it in backend/.env.")
    if genai is None:
        raise GeminiNotConfigured(
            "google-genai is not installed. Ensure 'google-genai' exists in backend/requirements.txt and install."
        )
    return genai.Client(api_key=api_key)


def _gen_plain(model: str, system_instruction: str, contents: str) -> str:
    client = _get_client()
    response = client.models.generate_content(
        model=model,
        contents=contents,
        config={
            "system_instruction": system_instruction,
            "response_mime_type": "text/plain",
        },
    )
    return (response.text or "").strip()


def generate_openapi_from_markdown(markdown: str) -> str:
    """
    Generate an OpenAPI 3.1 specification (YAML) inferred from provided markdown/site docs.
    """
    system_instruction = (
        "Du bist ein API-Dokumentations-Experte. "
        "Erzeuge eine vollständige OpenAPI 3.1 Spezifikation im YAML-Format aus dem gegebenen Kontext. "
        "Beinhalte Info, Servers (Platzhalter falls unbekannt), Security (falls ableitbar), Paths, Schemas, Components. "
        "Antworte NUR mit gültigem YAML."
    )
    contents = f"KONTEXT (Markdown):\n{markdown}\n\nAUFGABE: Erzeuge OpenAPI 3.1 YAML (nur YAML)."
    spec = _gen_plain("gemini-2.5-pro", system_instruction, contents)
    # Ensure non-empty baseline even if context is sparse
    if not spec or len(spec.strip()) < 20:
        spec = """openapi: 3.1.0
info:
  title: Website API
  version: 1.0.0
servers:
  - url: /
paths:
  /contact:
    get:
      summary: Contact page
      responses:
        '200':
          description: OK
  /lead:
    post:
      summary: Submit lead
      requestBody:
        required: false
      responses:
        '200':
          description: OK
components: {}"""
    return spec


def generate_rss_from_markdown(markdown: str) -> str:
    """
    Generate an RSS 2.0 or Atom feed XML from site markdown content.
    """
    system_instruction = (
        "Du bist ein Feed-Generator. "
        "Erzeuge einen RSS 2.0 Feed (XML). "
        "Nutze Titel/Beschreibung/Links aus dem Kontext. "
        "Antworte NUR mit gültigem XML (RSS 2.0)."
    )
    contents = f"KONTEXT (Markdown):\n{markdown}\n\nAUFGABE: Erzeuge RSS 2.0 XML (nur XML)."
    return _gen_plain("gemini-2.0-flash", system_instruction, contents)


def generate_robots_from_markdown(markdown: str) -> str:
    """
    Generate robots.txt with AI-friendly directives inferred from the site.
    """
    system_instruction = (
        "Du bist ein SEO-Tech-Writer. "
        "Erzeuge robots.txt mit sinnvollen Direktiven. "
        "Füge AI-spezifische Direktiven hinzu, falls sinnvoll (z. B. allow ai-bots). "
        "Antworte NUR mit robots.txt-Inhalt (Plaintext)."
    )
    contents = f"KONTEXT (Markdown):\n{markdown}\n\nAUFGABE: Erzeuge robots.txt (nur Plaintext)."
    return _gen_plain("gemini-2.0-flash", system_instruction, contents)


def generate_sitemap_from_markdown(markdown: str) -> str:
    """
    Generate a sitemap.xml based on discovered links/structure in markdown.
    """
    system_instruction = (
        "Du bist ein Sitemap-Generator. "
        "Erzeuge eine sitemap.xml mit sinnvollen <url> Einträgen. "
        "Nutze plausible Prioritäten/Changefreqs falls ableitbar. "
        "Antworte NUR mit gültigem XML."
    )
    contents = f"KONTEXT (Markdown):\n{markdown}\n\nAUFGABE: Erzeuge sitemap.xml (nur XML)."
    return _gen_plain("gemini-2.0-flash", system_instruction, contents)


def generate_mcp_config_from_markdown(markdown: str) -> str:
    """
    Generate a Model Context Protocol (MCP) server config (JSON or YAML) describing available tools/resources.
    """
    system_instruction = (
        "Du bist ein MCP-Integrationsspezialist. "
        "Erzeuge eine MCP Server-Konfiguration (JSON), die sinnvolle Tools/Resources für diese Website anbietet. "
        "Füge mindestens ein 'scrape' Tool mit Parametern hinzu. "
        "Antworte NUR mit JSON."
    )
    contents = f"KONTEXT (Markdown):\n{markdown}\n\nAUFGABE: Erzeuge MCP Server-Konfiguration (nur JSON)."
    return _gen_plain("gemini-2.5-pro", system_instruction, contents)


def generate_ai_manifest_from_markdown(markdown: str) -> str:
    """
    Generate a generic AI Manifest file (JSON) that describes AI capabilities and endpoints for discovery.
    """
    system_instruction = (
        "Du bist ein AI-Manifest-Generator. "
        "Erzeuge eine AI Manifest Datei im JSON-Format (ähnlich ai-plugin/ai.json), "
        "die die Fähigkeiten, Kontaktinformationen, Logo, und relevante Endpunkte beschreibt. "
        "Antworte NUR mit JSON."
    )
    contents = f"KONTEXT (Markdown):\n{markdown}\n\nAUFGABE: Erzeuge AI Manifest (nur JSON)."
    return _gen_plain("gemini-2.0-flash", system_instruction, contents)


def generate_llms_txt_from_markdown(markdown: str) -> str:
    """
    Generate a llms.txt file based on site content.
    llms.txt is a standardized file that describes how LLMs should interact with the site,
    including allowed/disallowed content, attribution preferences, and content policies.
    """
    system_instruction = (
        "Du bist ein llms.txt Generator. "
        "Erzeuge eine vollständige llms.txt Datei nach dem Standard für LLM-Zugriffspolitiken. "
        "Die Datei soll folgende Abschnitte enthalten:\n"
        "1. # Title - Kurzname der Website\n"
        "2. ## Description - Kurze Beschreibung der Website\n"
        "3. ## Allowed - Welche Inhalte dürfen LLMs nutzen\n"
        "4. ## Disallowed - Welche Inhalte sind ausgeschlossen\n"
        "5. ## Attribution - Wie sollen LLMs die Quelle zitieren\n"
        "6. ## Contact - Kontakt für Fragen\n"
        "7. ## Preferred-Citation - Bevorzugte Zitierweise\n"
        "8. ## Policy-Version - Version der Policy\n\n"
        "Leite alle Informationen aus dem gegebenen Kontext ab. "
        "Antworte NUR mit dem llms.txt Inhalt (Plaintext, Markdown-Format)."
    )
    contents = f"KONTEXT (Markdown):\n{markdown}\n\nAUFGABE: Erzeuge llms.txt (nur Plaintext mit Markdown-Überschriften)."
    result = _gen_plain("gemini-2.0-flash", system_instruction, contents)
    
    # Ensure we have a valid baseline
    if not result or len(result.strip()) < 30:
        result = """# Website

## Description
Website content and services.

## Allowed
- General website content
- Public documentation
- Service descriptions

## Disallowed
- Private user data
- Internal communications
- Proprietary business logic

## Attribution
Please cite as: "Source: [Website Name]"

## Contact
For questions about AI usage policy, please contact the website owner.

## Preferred-Citation
[Website Name] - https://example.com

## Policy-Version
1.0
"""
    return result
