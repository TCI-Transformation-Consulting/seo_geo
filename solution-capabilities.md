# Neuro‑Web – Fähigkeiten & Nutzen der Lösung (Gemini 1.5 + Firecrawl)

Diese Dokumentation beschreibt, was die Lösung leisten kann – heute und in der Roadmap – auf Basis von:
- Firecrawl: zuverlässiges Web‑Scraping zu sauberem Markdown
- Gemini 1.5 (Flash & Pro): schnelles Reasoning und riesiges Kontextfenster (bis ~2 Mio Tokens)

Ziel: Wettbewerbsfähige GEO/SEO‑Analyse, Content‑Ops und Monitoring ohne komplexe Vektor‑Datenbank, mit klaren, direkt nutzbaren Ergebnissen.

---

## 1) Zusammenfassung (Value Proposition)

- Sauberes Markdown statt chaotischem HTML: bessere Eingabequalität → weniger Halluzinationen.
- Long‑Context Analysen ohne Vektor‑DB: mehrere Wettbewerber + eigene Seite gleichzeitig bewerten.
- Fertige Deliverables: JSON‑LD, Gap‑Analysen, Fragekataloge, NAP‑Checks, Fact‑Checks.
- Agentische Workflows (optional): Tool‑Aufrufe (Scrape) werden vom Modell selbst initiiert.
- Schnelle Integration ins Frontend (Vite/React) und Backend (FastAPI), lokaler Dev‑Flow mit venv.

---

## 2) Kernfunktionen (Ist + Geplant)

1. Website‑Scan (IST)
   - Backend lädt eine Ziel‑URL, extrahiert Basissignale (Struktur, Meta, JSON‑LD‑Präsenz), liefert HTML‑Snippet und Scores.
   - Frontend kann ohne Backend in Mock‑Modus fallen (Demo‑Sicherheit).

2. HTML → Markdown via Firecrawl (GEPLANT)
   - Firecrawl entfernt Navigation/Ads, liefert fokussiertes Markdown je Seite/Domain.
   - Basis für alle nachfolgenden LLM‑Analysen.

3. Persona‑Simulation (IST – Frontend)
   - „Shopper“, „Analyst“, „Searcher“: wie „verschiedene AIs“ denselben Content wahrnehmen (Preis/Features, Datenqualität, Abfrage‑Treffer).
   - Ergebnis: Wahrnehmungs‑Summary, fehlende Datenpunkte, maschinenlesbare Score.

4. JSON‑LD Generator (IST – Frontend)
   - Aus HTML/Markdown validen Schema.org JSON‑LD erzeugen (Product/Service/Article).
   - Strict‑Typing, nur Script‑Inhalt als Output.

5. Artefact Foundry (IST – Frontend)
   - Aus Kontext + Prompt spezifische Artefakte erzeugen (JSON, YAML, XML, Code).
   - Nur Code als Output → direkt weiterverarbeitbar.

6. AI Content Chunks (GEPLANT – Stufe LEICHT)
   - Markdown in Themenblöcke zerlegen und kurz in H2 + knapper Absatz (≈50 Wörter) umschreiben.
   - Für schnelleres CMS‑Onboarding und strukturierte Content‑Module.

7. Question‑Intent Extraction (GEPLANT – Stufe LEICHT)
   - Implizite Nutzerfragen aus Wettbewerbs‑FAQs/Foren extrahieren.
   - Deduplizierter Fragenkatalog, thematisch gruppiert.

8. Semantic Coverage / Gap‑Analyse (GEPLANT – Stufe MITTEL)
   - Top‑Seiten von mehreren Wettbewerbern + eigene Seite in einem Pro‑Call analysieren.
   - Liefert fehlende Themen inkl. fertigen H2+Absatz‑Snippets je Lücke.

9. NAP‑Audit (Name, Address, Phone) (GEPLANT – Stufe MITTEL)
   - Kontakt/Impressum scrapen, NAP als standardisiertes JSON extrahieren, Konsistenz prüfen.

10. Fact Checker (GEPLANT – Stufe MITTEL)
    - Aussagen ausschließlich gegen bereitgestellten Kontext prüfen (PDFs, „Über uns“).
    - Output: Urteil (true/false/uncertain) + Belege/Zitate.

11. Hallucination Detection (GEPLANT – Stufe SCHWER)
    - Generierten Text mit Firecrawl‑Faktenbasis der Marke vergleichen.
    - Markiert Widersprüche inkl. Fundstellen/Confidence.

12. Agentic Loop / Tool‑Use (GEPLANT – Stufe SCHWER)
    - Gemini 1.5 Pro mit Function‑Calling.
    - Tool `firecrawl_scrape(url, limit, formats=['markdown'])` wird autonom aufgerufen, wenn nötig.

13. Exporte & Ops (GEPLANT)
    - JSON/CSV‑Download im UI, optional Google Sheets‑Export.
    - Prompt‑Snapshots/Regression‑Tests für Qualität.

---

## Audit Scope – What We Check (8 Dimensionen)

- Structure & Accessibility — HTML semantics, heading hierarchy, navigation clarity
- Structured Data — JSON-LD schema markup, microdata, rich snippets
- Content Quality — Clarity, completeness, metadata, readability
- API Documentation — OpenAPI specs, endpoint discovery, authentication docs
- Robots & Policies — robots.txt, AI-specific directives, crawl permissions
- Feed Availability — RSS/Atom feeds, AI-specific metadata, update frequency
- MCP Integration — Model Context Protocol server configuration
- Monitoring Setup — Change detection, alert configuration, health checks

## Generated Artifacts – What We Generate (mit Credits)

- JSON-LD Schema Markup (Organization, Product, FAQ, HowTo, Article) — 5–10 credits
- OpenAPI Specification (vollständige API-Dokumentation inkl. Endpunkte & Schemas) — 15–20 credits
- Enhanced RSS Feed (AI-optimierte Feeds mit strukturierten Metadaten) — 8–12 credits
- Robots.txt Configuration (AI‑freundliche Crawl‑Direktiven & Berechtigungen) — 3–5 credits
- XML Sitemap (umfassend, mit AI‑spezifischen Annotationen) — 5–8 credits
- MCP Server Config (Model Context Protocol Server & Tools) — 10–15 credits
- AI Manifest File (zentrale AI‑Discovery & Capability‑Beschreibung) — 5–8 credits

## 3) Wichtige Anwendungsfälle

- GEO/SEO & Content Strategy:
  - Themen‑Lücken schnell finden und mit fertigen Bausteinen schließen.
  - JSON‑LD Hygiene erhöhen (Preise, Verfügbarkeit, Produktdaten).
- Support & Reputation:
  - Review‑Antworten freundlich, konsistent, knapp generieren.
  - Question‑Intent hilft, Self‑Service/FAQ zu priorisieren.
- Compliance & Trust:
  - Fact‑Checks gegen „Source of Truth“.
  - NAP‑Konsistenz für Local SEO und Verzeichnisse.
- Monitoring:
  - Halluzinationen und falsche Behauptungen früh erkennen.

---

## 4) Technische Architektur (High‑Level)

- Frontend: Vite + React + TypeScript
  - Direktes Gemini‑SDK möglich (Client‑seitig) für Simulation/JSON‑LD/Artefakte.
  - Fallback‑Mock bei Backend‑Ausfall.
- Backend: FastAPI (Python)
  - venv unter `backend/.venv`, CORS für `http://localhost:3000`
  - Endpunkte für Scan/Analysen (siehe API‑Übersicht)
- Firecrawl:
  - `scrape_url` / `crawl_url` → Markdown‑Korpus
- Gemini:
  - Flash: schnell für Umformung/Extraktion
  - Pro: Long‑Context, tiefe Analysen
- Sicherheit:
  - `.env` für Secrets (GEMINI_API_KEY, FIRECRAWL_API_KEY)
  - Domain‑Allowlist, Rate‑Limits, Token‑Budgeting pro Feature

---

## 5) API‑Übersicht (Aktuell + Geplant)

Aktuell:
- `GET /api/v1/health` → Service OK
- `POST /api/v1/scan { url }` → Basis‑Audit + HTML‑Snippet

Geplant (Beispiele):
- `POST /api/v1/content/chunks { url }` → H2 + Kurzabsätze aus Markdown
- `POST /api/v1/content/questions { urls[] | url }` → Fragenkatalog + Cluster
- `POST /api/v1/analysis/semantic-coverage { my_url, competitors[], top_n }` → Gap‑Analyse mit Textvorschlägen
- `POST /api/v1/analysis/nap-audit { url }` → NAP‑JSON
- `POST /api/v1/analysis/fact-check { claim, context_urls[] }` → Urteil + Zitate
- `POST /api/v1/monitoring/hallucination-detect { generated_text, brand_url }` → Widersprüche
- `POST /api/v1/agents/runner { goal, constraints }` → Tool‑gestützter, auditierbarer Run

Antwortformate sind JSON; große Markdown‑Kontexte werden server‑seitig gehandhabt, um Browser‑Limits zu vermeiden.

---

## 6) Datenflüsse (vereinfacht)

1) Frontend sendet Ziel(e) → Backend.
2) Backend nutzt Firecrawl → erhält Markdown.
3) Backend / Frontend ruft Gemini (Flash/Pro) mit klaren Prompts & `response_mime_type` (z. B. JSON).
4) Ergebnis wird als klarer JSON‑Contract zurückgegeben; optional Persistenz/Export.

---

## 7) Qualität & Guardrails

- Prompt‑Design:
  - Rollen/Instruktionen strikt, Output‑Formate fest (JSON/Plain).
- Guardrails:
  - Domain‑Allowlist, Rate‑Limits, Timeout & Retries.
  - Max‑Token/Model‑Wahl per Feature, um Kosten zu steuern.
- Tests:
  - Prompt‑Snapshots, Unit‑Tests für Adapter, E2E mit 1–2 realen Domains.

---

## 8) Grenzen & Annahmen

- Firecrawl kann nicht in geschützte Bereiche einloggen (keine Paywalls/Form‑Logins).
- Sehr große Sites müssen ggf. limitiert/gechunked werden (top_n, Sitemaps).
- PDF‑Parsing/Qualität abhängig von Quelle; ggf. Pre‑Processing nötig.
- Long‑Context ist stark, aber Kosten/Latenz steigen mit Kontextgröße.

---

## 9) KPIs & Erfolgskriterien

- Abdeckung: # identifizierter Gaps pro Domain/Cluster
- Richtigkeit: Fact‑Checker‑Quote, belegte Zitate
- TTK (Time‑to‑Knowledge): Minuten bis zu verwertbarem Output
- Kosten: $/Analyse (Modellwahl, Token‑Budget)
- Nutzungsgrad: # Analysen/Woche, Export‑Frequenz

---

## 10) Betrieb & Setup (Lokal)

- Python venv: `python -m venv backend/.venv`
- Install: `backend/.venv/Scripts/python -m pip install -r backend/requirements.txt`
- Env: `backend/.env` mit `GEMINI_API_KEY`, `FIRECRAWL_API_KEY`, `FRONTEND_ORIGIN`
- Start Backend: `backend/.venv/Scripts/python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload`
- Frontend: `npm install && npm run dev` (Vite auf :3000)

---

## 11) Roadmap nach Stufen

- Stufe LEICHT:
  - AI Content Chunks
  - Question‑Intent
  - (Optional) Review‑Response
- Stufe MITTEL:
  - Semantic Coverage / Gap‑Analyse
  - NAP‑Audit
  - Fact‑Checker
- Stufe SCHWER:
  - Hallucination Detection
  - Agentic Loop (Function‑Calling, Tool‑Use)
  - Monitoring/Exports

---

## 12) Prompt‑Skizzen (Kurz)

- Chunks (Flash): „Nimm dieses Markdown… H2 (Frage) + Absatz (≤50 Wörter)…“
- Questions (Flash): „Extrahiere implizite Nutzerfragen… Liste + Cluster…“
- Coverage (Pro): „Markdown A,B,C + mein Content… Welche Themen fehlen mir?… Gap‑Analyse mit H2+Absatz.“
- NAP (Flash): „Extrahiere Name, Adresse, Telefonnummer als JSON.“
- Fact (Pro): „Nutze NUR diesen Kontext… Prüfe Aussage… JSON: verdict, evidence, citations.“
- Hallucination (Pro): „Vergleiche generierten Text mit Firecrawl‑Faktenbasis… Widersprüche + Fundstellen.“

---

## 13) Erweiterungen

- Sitemap‑Ingestion, Batch‑Jobs, Caching von Crawls
- Multi‑Locale/Region, SERP‑basierte Themenfindung
- Export‑Pipelines (Sheets, CMS, Git Repos)
- Policy‑Filter (PII, Sensitive Content) im Ingest‑Pfad
