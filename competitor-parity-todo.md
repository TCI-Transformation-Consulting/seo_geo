# Competitor Parity TODO (Gemini 1.5 Pro/Flash + Firecrawl)

Ziel: Funktionen mindestens auf Wettbewerbsniveau liefern, basierend auf dem Stack Gemini 1.5 (Pro & Flash) + Firecrawl. Fokus: schnelle Umsetzung mit großem Kontextfenster (keine Vektor-DB nötig), robuste Crawls zu sauberem Markdown, reproduzierbare Analysen, klare Deliverables.

## 0) Foundation & DevOps

- [ ] Virtuelle Umgebung nutzen (backend/.venv) und `.env` pflegen
  - [ ] ENV: `GEMINI_API_KEY`, `FIRECRAWL_API_KEY`, `FRONTEND_ORIGIN`
  - [ ] `.env.example` erweitern um `FIRECRAWL_API_KEY`
- [ ] Dependencies ergänzen/prüfen (Backend, Python)
  - [ ] `firecrawl-py` installieren
  - [ ] `google-generativeai` (falls Python-Backend Gemini nutzt) ODER Client bleibt im Frontend bei `@google/genai`
- [ ] Secrets-Policy
  - [ ] Keine Keys im Repo, nur `.env`
  - [ ] Rate-Limits / Retries definieren
- [ ] API-Doku und CORS
  - [ ] OpenAPI Tags für neue Endpunkte
  - [ ] CORS für `http://localhost:3000`

## Audit Scope – What We Check (8 Dimensions)

- [ ] 1. Structure & Accessibility — HTML semantics, heading hierarchy, navigation clarity
- [ ] 2. Structured Data — JSON-LD schema markup, microdata, rich snippets
- [ ] 3. Content Quality — Clarity, completeness, metadata, readability
- [ ] 4. API Documentation — OpenAPI specs, endpoint discovery, authentication docs
- [ ] 5. Robots & Policies — robots.txt, AI-specific directives, crawl permissions
- [ ] 6. Feed Availability — RSS/Atom feeds, AI-specific metadata, update frequency
- [ ] 7. MCP Integration — Model Context Protocol server configuration
- [ ] 8. Monitoring Setup — Change detection, alert configuration, health checks

## Generated Artifacts – What We Generate (with credits)

- [ ] JSON-LD Schema Markup (Organization, Product, FAQ, HowTo, Article) — 5–10 credits
- [ ] OpenAPI Specification (complete API documentation with endpoints and schemas) — 15–20 credits
- [ ] Enhanced RSS Feed (AI-optimized feeds with structured metadata) — 8–12 credits
- [ ] Robots.txt Configuration (AI-friendly crawl directives and permissions) — 3–5 credits
- [ ] XML Sitemap (comprehensive with AI-specific annotations) — 5–8 credits
- [ ] MCP Server Config (Model Context Protocol server setup and tools) — 10–15 credits
- [ ] AI Manifest File (centralized AI discovery and capabilities document) — 5–8 credits

## 1) Stufe LEICHT – Content & Structure

### 1.1 AI Content Chunks (Inhalt strukturieren)
- [ ] Endpoint: `POST /content/chunks` (Input: `url`)
- [ ] Firecrawl: `app.scrape_url(url, params={'formats': ['markdown']})`
- [ ] Gemini 1.5 Flash: Prompt
  - [ ] Prompt: „Nimm dieses Markdown. Finde Themenblöcke. Schreibe sie um in: H2 (Frage) + Absatz (Direkte Antwort, max 50 Wörter).“
- [ ] Ergebnis speichern (Optionen)
  - [ ] Rückgabe als JSON an Frontend
  - [ ] Optional persistieren (File/DB) für CMS-Export
- [ ] Akzeptanzkriterien
  - [ ] Mind. 80% der Hauptthemen in H2/Absatz-Form erfasst
  - [ ] Keine Navigations-/Footer-Artefakte im Output

### 1.2 Question-Intent (Welche Fragen haben Nutzer?)
- [ ] Endpoint: `POST /content/questions` (Input: Liste von Competitor-URLs oder single `url`)
- [ ] Firecrawl: FAQs/Foren (z. B. Reddit-Threads) als Markdown holen
- [ ] Gemini 1.5 Flash: Prompt
  - [ ] Prompt: „Extrahiere alle impliziten Fragen, die Nutzer haben. Liste als Fragenkatalog.“
- [ ] Clustering
  - [ ] Einfache thematische Gruppierung (LLM-basiert)
- [ ] Akzeptanzkriterien
  - [ ] Deduplizierte Liste mit 10–50 Fragen, gruppiert nach Themen

### 1.3 Review Response (Antworten auf Bewertungen) – optional
- [ ] Endpoint: `POST /content/review-response`
- [ ] Gemini 1.5 Flash: Prompt
  - [ ] Prompt: „Du bist ein freundlicher Support-Agent. Antworte auf diese Bewertung: {review_text}.“
- [ ] Export
  - [ ] Optionaler Export nach Google Sheets / CSV

## 2) Stufe MITTEL – Deep Analysis (Gemini Pro glänzt)

### 2.1 Semantic Coverage (Themenabdeckung / Gap-Analyse)
- [ ] Endpoint: `POST /analysis/semantic-coverage` (Input: `my_url`, `competitors[]`, `top_n=10`)
- [ ] Firecrawl: `app.crawl_url(competitor_url, params={'limit': 10, 'formats': ['markdown']})`
  - [ ] Top 10 Seiten von 3 Wettbewerbern holen
  - [ ] Eigene Seite ebenfalls scrapen
- [ ] Gemini 1.5 Pro: Long-Context Analyse
  - [ ] Prompt: „Hier ist Content A, B, C (Markdown). Hier ist MEIN Content. Welche Themen decken A,B,C ab, die mir fehlen? Gap-Analyse.“
- [ ] Output
  - [ ] JSON mit Lückenliste + empfohlene H2+Absatz-Texte je Lücke
- [ ] Akzeptanzkriterien
  - [ ] Konkrete, umsetzbare Lücken (>=5) mit Vorschlagstexten
  - [ ] Verweise auf Seiten/Abschnitte der Konkurrenten

### 2.2 NAP-Audit (Name, Address, Phone)
- [ ] Endpoint: `POST /analysis/nap-audit` (Input: `url`)
- [ ] Firecrawl: „Kontakt“/„Impressum“ Seiten scrapen (Markdown)
- [ ] Gemini 1.5 Flash: JSON-Extraktion
  - [ ] Prompt: „Extrahiere Name, Adresse, Telefonnummer als standardisiertes JSON.“
- [ ] Vergleich
  - [ ] Optional Abgleich mit Kundendatenbank / CRM
- [ ] Akzeptanzkriterien
  - [ ] Valides JSON, Felder vollständig oder mit „missing“ markiert

### 2.3 Fact Checker (Wahrheit prüfen)
- [ ] Endpoint: `POST /analysis/fact-check` (Input: `claim`, `context_urls[]`)
- [ ] Firecrawl: „Source of Truth“ (PDFs/„Über uns“/Docs) scrapen
- [ ] Gemini 1.5 Pro: Faktenprüfung nur mit gegebenem Kontext
  - [ ] Prompt: „Nutze NUR diesen Kontext. Prüfe Aussage: '{Aussage}'.“
- [ ] Output
  - [ ] JSON mit Urteil (true/false/uncertain) + Zitaten/Belegen
- [ ] Export
  - [ ] Optional Sheets/CSV Export
- [ ] Akzeptanzkriterien
  - [ ] Nachvollziehbare Belege (Quellenzitate)

## 3) Stufe SCHWER – Monitoring & Agents

### 3.1 Hallucination Detection
- [ ] Endpoint: `POST /monitoring/hallucination-detect` (Input: `generated_text`, `brand_url`)
- [ ] Firecrawl: Firmenwebsite/SE-Resultate als Faktenbasis holen
- [ ] Gemini 1.5 Pro: Vergleich Text vs. Faktenbasis
- [ ] Output
  - [ ] JSON: Widersprüche + Confidence + Fundstellen
- [ ] Akzeptanzkriterien
  - [ ] Markiert falsche/unsichere Behauptungen mit Verweisen

### 3.2 Agentic Loop (Autopilot mit Tool-Calls)
- [ ] Tool-Spec: `firecrawl_scrape` (Params: `url`, `limit`, `formats=['markdown']`)
- [ ] Gemini 1.5 Pro (Function Calling)
  - [ ] Agent entscheidet selbst: „Ich muss Preise prüfen“ → ruft `firecrawl_scrape`
- [ ] Endpoint: `POST /agents/runner` (Input: `goal`, `constraints`)
- [ ] Sicherheitsgeländer
  - [ ] Domain-Allowlist
  - [ ] Max-Token/Max-Calls Limits
- [ ] Akzeptanzkriterien
  - [ ] Agent führt 1–3 Toolschritte deterministisch aus, liefert auditierbares Protokoll

## 4) Frontend-Integration

- [ ] API-Client erweitern (services/api.ts)
  - [ ] Methoden: `contentChunks`, `questionIntent`, `semanticCoverage`, `napAudit`, `factCheck`, `hallucinationDetect`, `agentRun`
- [ ] Views/Flows
  - [ ] OptimizationView: Buttons/Aktionen für Stufe 1–3
  - [ ] ProjectDetailView: Ergebnisse (JSON/Tabellen/Export) darstellen
- [ ] UX
  - [ ] Ladezustände, Fehler, Retry
  - [ ] Copy-to-Clipboard, Download (JSON/CSV)

## 5) Qualität, Kosten, KPIs

- [ ] Metriken
  - [ ] Abdeckung (# identifizierter Gaps)
  - [ ] Richtigkeit (Fact-Checker %)
  - [ ] Laufzeit/Cost pro Analyse
- [ ] Tests
  - [ ] Unit-Tests: Firecrawl-Adapter (Mock)
  - [ ] Prompt Snapshots (Regression)
  - [ ] E2E: 1–2 reale Domains
- [ ] Kostenkontrolle
  - [ ] Max-Tokens/Modelwahl (Flash vs Pro) per Feature
  - [ ] Caching für wiederholte Crawls

## 6) Beispiel-Skript (Stufe 2: Semantic Coverage)

- [ ] Python-Skript/Service analog Beispiel:
  - [ ] Firecrawl für `my_url` + `competitor_url`
  - [ ] Gemini 1.5 Pro für Gap-Analyse
  - [ ] Output als JSON
- [ ] Optional: Backend-Endpoint statt Standalone-Skript

## 7) Rollout & Docs

- [ ] README aktualisieren (venv, Env-Vars, Start, Endpunkte)
- [ ] Demo-Playbook (5 Minuten)
- [ ] Changelog/Versionsnummern

---

## Prompts (Kurzfassung zum Einpflegen)

- [ ] AI Content Chunks (Flash): „Nimm dieses Markdown. Finde Themenblöcke. Schreibe sie um in: H2 (Frage) + Absatz (Direkte Antwort, max 50 Wörter).“
- [ ] Question-Intent (Flash): „Extrahiere aus diesem Text alle impliziten Nutzerfragen. Liefere als Liste (Frage, Themencluster).“
- [ ] Semantic Coverage (Pro): „Hier sind Markdown-Inhalte von A,B,C und MEIN Content. Welche Themen decken A,B,C ab, die mir fehlen? Erstelle Gap-Analyse mit Vorschlagstexten.“
- [ ] NAP-Audit (Flash): „Extrahiere Name, Adresse, Telefonnummer als standardisiertes JSON.“
- [ ] Fact Checker (Pro): „Nutze NUR diesen Kontext. Prüfe Aussage: '{Aussage}'. Antworte JSON: verdict, evidence, citations.“
- [ ] Hallucination Detection (Pro): „Vergleiche generierten Text mit Firecrawl-Faktenbasis. Finde Widersprüche. JSON mit Stellen/Citations.“
- [ ] Agentic Loop (Pro + Function Calling): Tool-Schema `firecrawl_scrape`, der Agent entscheidet autonom, wann er scrapen muss.
