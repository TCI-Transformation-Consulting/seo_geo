<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Neuro-Web (GEO/SEO AI) – Überblick und Bedienung

Diese Lösung kombiniert ein React-Frontend mit einem FastAPI-Backend, um Webseiten-Inhalte per Firecrawl zu erfassen und mit Googles Gemini-Modellen zu analysieren, zu bewerten und Artefakte (z. B. JSON-LD, OpenAPI, RSS, robots.txt, sitemap.xml, MCP-Config, AI Manifest) zu generieren. Zusätzlich bietet sie Monitoring (Halluzinations-Detektion) und einfache Agent-Workflows.

Frontend: Vite + React + TypeScript  
Backend: FastAPI (Python) + google-genai SDK + Firecrawl

Live-Ansicht der ursprünglichen AI Studio App (historisch):  
https://ai.studio/apps/drive/1bsPj4sW9k_CVbE6fOmSueCa8I-UB1P__

## Features

- Content
  - Content Chunks: Extrahiert H2-Fragen und kurze Antworten aus einer Seite
  - Content Questions: Extrahiert implizite Nutzerfragen aus einer oder mehreren Seiten
- Analysis
  - NAP Audit: Name/Address/Phone aus einer Seite extrahieren
  - Semantic Coverage (Gap-Analyse): Eigene Seite vs. Wettbewerber (Top-N Seiten) vergleichen
  - Fact Check: Behauptung gegen kontextuelle Seiten prüfen
- Generation
  - JSON-LD (Schema.org) für Organization, Product, FAQ, HowTo, Article
  - OpenAPI 3.1 (YAML) aus Docs/Markdown ableiten
  - RSS (XML), robots.txt (Plaintext), sitemap.xml (XML)
  - MCP-Server-Konfiguration (JSON), AI Manifest (JSON)
- Monitoring
  - Hallucination Detect: Generierten Text gegen Marken-/Seitenkontext prüfen
- Agents
  - Einfache Agent-Runner-Demo, die Firecrawl nutzt (Scans/Extrakte und kurze Zusammenfassungen)

Hinweis: Das UI entfernt automatisch Code-Fences (```yaml, ```xml, ```json) in Generierungsergebnissen, um die Inhalte sauber anzuzeigen.

## Architektur

- Frontend (Vite/React/TS)
  - Einstieg: `index.html`, `index.tsx`, App-Shell in `App.tsx`
  - Views:
    - `views/ProjectDetailView.tsx`: Enthält die Funktions-Tabs Content, Analysis, Monitoring, Generation, Agents
    - `views/OptimizationView.tsx`: Simulator/Perception-Demo für HTML-Inhalte (unabhängig vom Backend)
  - Services:
    - `services/api.ts`: REST-Client für `/api/v1/...` Endpunkte
    - `services/geminiService.ts`: Nur für Simulator-Demo (optional/entkoppelt vom Backend)
- Backend (FastAPI)
  - Einstieg: `backend/main.py`
    - Lädt `.env` (Backend-Ordner hat Priorität), setzt Fallbacks aus `backend/config.py`
    - Bindet API-Router `backend/app/api/endpoints.py`
  - Endpunkte: `backend/app/api/endpoints.py`
  - Services:
    - `backend/app/services/firecrawl_service.py` (Crawl/Scrape via Firecrawl)
    - `backend/app/services/gemini_service.py` (Analysetasks; Modelle: gemini-2.0-flash, gemini-2.5-pro)
    - `backend/app/services/generation_service.py` (Artefakt-Generierung)
    - `backend/app/services/monitoring_service.py` (Halluzinations-Detektion)
  - Modelle/Schemas: `backend/app/models/schemas.py`

## Voraussetzungen

- Node.js 18+ (Frontend)
- Python 3.10+ (Backend)
- Google API Key (Gemini): GEMINI_API_KEY
- Firecrawl API Key (optional, empfohlen): FIRECRAWL_API_KEY

## Installation

1) Frontend-Abhängigkeiten installieren
\`\`\`bash
npm install
\`\`\`

2) Backend-Umgebung einrichten (empfohlenes venv)
\`\`\`bash
# Windows PowerShell (im Projektwurzelordner):
python -m venv backend\.venv
backend\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
\`\`\`

3) Umgebungsvariablen setzen
- Bevorzugt: `backend/.env` anlegen:
\`\`\`
GEMINI_API_KEY=your_gemini_key_here
FIRECRAWL_API_KEY=fc-xxxxxxxxxxxxxxxx
FRONTEND_ORIGIN=http://localhost:3000
\`\`\`
- Alternativ (Fallback): In `backend/config.py` sind Platzhalter vorhanden. `main.py` setzt diese Werte nur, wenn sie nicht bereits in der Umgebung existieren.

## Starten der Anwendung

- Backend (FastAPI, default Port 8000):
\`\`\`bash
# im Projektwurzelordner:
backend\.venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload --port 8000
\`\`\`

- Frontend (Vite, default Port 3000, fällt ggf. auf 3001 zurück):
\`\`\`bash
npm run dev
# Ausgabe zeigt die URL, z. B. http://localhost:3000/ oder http://localhost:3001/
\`\`\`

CORS: `backend/main.py` erlaubt standardmäßig `http://localhost:3000` (und 127.0.0.1:3000). Wenn Vite einen Ausweich-Port (z. B. 3001) nutzt, können Sie `FRONTEND_ORIGIN` im Backend `.env` setzen.

## UI – Bedienung

- Landing: Scan starten (falls Backend nicht erreichbar, liefert das Frontend Mockdaten)
- Dashboard: Übersicht über Projekte (Mock+Ad-hoc)
- Project Detail:
  - Content:
    - Content Chunks: URL + max_chunks
    - Content Questions: URL + max_items
  - Analysis:
    - Semantic Coverage: Eigene URL + Wettbewerber (CSV) + Top-N
    - NAP Audit: URL
    - Fact Check: Claim + Kontext-URLs (CSV)
  - Monitoring:
    - Hallucination Detect: Generierter Text + Brand URL
  - Generation:
    - JSON-LD / OpenAPI / RSS / robots.txt / sitemap.xml / MCP Config / AI Manifest
    - Auswahl der URL und Schema-Typen (bei JSON-LD)
  - Agents:
    - Agent-Ziel, URLs (CSV), Domain Allowlist (CSV), max calls – ruft Firecrawl-Tools auf und fasst zusammen

## REST API (Kurzreferenz)

Basis: `http://localhost:8000/api/v1`

- GET `/health` – Service-Status
- GET `/debug/gemini` – Testet GEMINI_API_KEY + Minimalaufruf (nur in Dev; vor Prod entfernen)
- POST `/scan` – (Demo) Seiten-Scan (siehe `services/crawler_service.py`)
- Content:
  - POST `/content/chunks` { url, max_chunks }
  - POST `/content/questions` { url | urls[], max_items }
  - POST `/content/review-response` { review_text }
- Analysis:
  - POST `/analysis/nap-audit` { url }
  - POST `/analysis/semantic-coverage` { my_url, competitors[], top_n }
  - POST `/analysis/fact-check` { claim, context_urls[] }
  - POST `/monitoring/hallucination-detect` { generated_text, brand_url }
- Generation:
  - POST `/generation/jsonld` { url, schema_type }
  - POST `/generation/openapi` { url }
  - POST `/generation/rss` { url }
  - POST `/generation/robots` { url }
  - POST `/generation/sitemap` { url }
  - POST `/generation/mcp-config` { url }
  - POST `/generation/ai-manifest` { url }
- Agents:
  - POST `/agents/runner` { goal, urls[], constraints? }

Antworten sind JSON. Für einige Generatoren wird der erzeugte Inhalt als String im JSON geliefert.

## Modelle und SDKs

- Google GenAI (SDK: `google-genai`)
  - Schnelle Textgenerierung: `gemini-2.0-flash`
  - Analytische Aufgaben (Gap-Analyse, Fact Check, Hallu): `gemini-2.5-pro`
  - Alle Aufrufe über `client.models.generate_content(model=..., contents=..., config=...)` mit
    - `system_instruction`
    - `response_mime_type` (z. B. `application/json`, `text/plain`)
- Firecrawl
  - Zum Scrapen/Crawlen von Seiten (Markdown-Extraktion); erfordert `FIRECRAWL_API_KEY`

## Troubleshooting

- Fehler 400 (Ungültige Anforderung) bei Endpunkten:
  - Prüfen, ob die erwarteten Felder korrekt benannt sind (siehe Schemas in `backend/app/models/schemas.py`).
- Fehler 502 (Bad Gateway) beim Generieren (vorher):
  - Modelle/SDK-Signatur aktualisiert. Stellen Sie sicher, dass `google-genai` installiert und `GEMINI_API_KEY` gesetzt ist.
- Umlaute/Mojibake in PowerShell:
  - Konsole kann bei UTF-8 problematisch sein. Die API liefert korrektes UTF-8; UI zeigt es korrekt an.
- Kein Firecrawl-Schlüssel:
  - Funktionen, die Crawling/Scraping benötigen, schlagen fehl. Setzen Sie `FIRECRAWL_API_KEY`.

## Sicherheit und Produktion

- Geheimnisse nie committen. Nutzen Sie `.env` und Deployment-Secret-Manager.
- Debug-Endpunkte (`/debug/gemini`, temporär: `/debug/review-client`, `/debug/hallu-stack`) sind nur für die Entwicklung – vor Produktion entfernen.
- Produktion:
  - Backend mit `uvicorn`/`gunicorn` hinter Reverse Proxy (Nginx/Caddy)
  - Frontend statisch bauen und ausliefern:
    \`\`\`bash
    npm run build
    \`\`\`
    Das `dist/` Verzeichnis kann über jeden Webserver bereitgestellt werden.
- CORS so einschränken, dass nur die echte Frontend-Domain erlaubt ist.

## Lokaler Schnelltest (PowerShell)

\`\`\`powershell
# Backend muss auf :8000 laufen
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/health" -Method GET

# Debug Gemini (nur Dev)
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/debug/gemini" -Method GET

# Content Chunks
$body = @{ url = "https://www.neuewerte.de/"; max_chunks = 4 } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/content/chunks" -Method POST -ContentType "application/json" -Body $body
\`\`\`

## Projektstruktur (Auszug)

- Frontend:
  - `App.tsx`, `index.tsx`, `index.html`
  - `views/ProjectDetailView.tsx`, `views/OptimizationView.tsx`
  - `services/api.ts`
- Backend:
  - `backend/main.py`, `backend/config.py`, `backend/.env.example`
  - `backend/app/api/endpoints.py`
  - `backend/app/services/*` (gemini_service, generation_service, firecrawl_service, monitoring_service, agents_service)
  - `backend/app/models/schemas.py`
  - `backend/requirements.txt`

## Lizenz

Interne Projektbasis. Lizenzierung nach Absprache.
