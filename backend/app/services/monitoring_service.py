from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

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


def detect_hallucinations(generated_text: str, brand_markdown: str) -> List[Dict[str, Any]]:
    """
    Compare generated_text with brand_markdown and return a list of findings:
    [
      {
        "statement": "...",
        "contradiction": "...",
        "citation": "https://...",
        "confidence": 0.0-1.0
      }, ...
    ]
    """
    client = _get_client()

    system_instruction = (
        "Vergleiche den generierten Text mit dem gegebenen Marken-/Webseitenkontext. "
        "Finde widersprüchliche, unbelegte oder unsichere Aussagen. "
        "Antworte NUR als JSON-Liste von Objekten mit Feldern: "
        "'statement' (string, Teil aus dem generierten Text), "
        "'contradiction' (string, kurze Begründung), "
        "'citation' (string, URL oder Abschnitt aus dem Kontext, optional), "
        "'confidence' (float 0-1, optional). "
        "Keine Erklärtexte, keine zusätzlichen Felder."
    )

    contents = (
        "GENERIERTER TEXT:\n"
        f"{generated_text}\n\n"
        "MARKEN-/WEBSITEN-KONTEXT (Markdown):\n"
        f"{brand_markdown}\n\n"
        "AUFGABE: Finde Halluzinationen/Widersprüche wie beschrieben. Antworte nur JSON."
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

    findings: List[Dict[str, Any]] = []
    if isinstance(data, list):
        for it in data:
            if not isinstance(it, dict):
                continue
            statement = (it.get("statement") or "").strip()
            contradiction = (it.get("contradiction") or "").strip()
            citation = (it.get("citation") or "").strip()
            confidence = it.get("confidence")
            obj: Dict[str, Any] = {"statement": statement}
            if contradiction:
                obj["contradiction"] = contradiction
            if citation:
                obj["citation"] = citation
            if isinstance(confidence, (int, float)):
                try:
                    obj["confidence"] = float(confidence)
                except Exception:
                    pass
            if statement or contradiction or citation:
                findings.append(obj)

    return findings
