# Neuro‑Web Frontend UX Concept v2 (Simple‑first + Automated)
Simplified, automation‑focused UX that keeps all analysis and generation powers while minimizing input and navigation.

Version: 2.0  
Scope: Single‑field workflows, automation presets, progressive disclosure (Simple vs Advanced), unified outputs, and implementation notes mapped to existing APIs.

---

## 1) Goals
- Minimize user decisions: domain in, results out.
- One primary entry: Quick Check (single domain + selected checks).
- Automation by default: presets and optional auto‑run.
- Keep power user features accessible via Advanced mode.
- Clear status, errors, and export/copy of results.

Success: A non‑technical user can run core checks within a single panel without visiting sub‑tabs.

---

## 2) Modes (Progressive Disclosure)
- Simple Mode (default):
  - Shows only the Quick Check panel and summary.
  - No extra inputs required; a few optional choices (presets, auto‑run).
  - Results populate inline; artifacts available for copy/download.
- Advanced Mode:
  - Reveals all detailed panels (Content, Analysis, Monitoring, Generation, Agents).
  - Sticky inputs remain for each section to keep usability high.

Mode switch is available in the Project header next to Service Status.

---

## 3) Entry Flow (Quick Check)
- Primary input:
  - Domain (single field)
- Presets:
  - SEO Basic: Chunks, Questions, NAP, JSON‑LD, robots.txt, sitemap.xml
  - Dev Artifacts: JSON‑LD, robots.txt, sitemap.xml
  - Full: All of the above + Coverage
- Checkboxes:
  - Chunks, Questions, NAP, Coverage, JSON‑LD, robots.txt, sitemap.xml
- Controls:
  - Run (primary)
  - Auto‑run (optional, debounced on edit)
- Result:
  - Quick Summary list of checks with status and short notes (e.g., “8 items”, “2 gaps”)
  - Latest artifact output (JSON‑LD / robots.txt / sitemap.xml) is rendered with copy/download
  - Advanced panels use the same domain automatically if you switch to Advanced mode

---

## 4) Automation Levels
- Level 0: Manual Run (default)
- Level 1: Auto‑run on domain change (debounced)
- Level 2 (future): “Run after finish” chained actions (e.g., generate sitemap after coverage completes)  
  Implementation can use sequenced promises within runQuick and a “Post‑run” selector.

---

## 5) Outputs
- Unified output viewer (ResultCard):
  - Strips code fences
  - Copy & Download with correct extension (json/yaml/xml/txt)
- Quick Summary:
  - Status chips per check, short note (count/error)
  - Non‑blocking errors (summary still shows what succeeded)
- Advanced artifacts:
  - Available when in Advanced mode (unchanged APIs, improved presentation)

---

## 6) Navigation & IA (Revised)
- Project Header:
  - Back, Title/domain, Service Status, Mode switch (Simple / Advanced)
- Content (default tab):
  - Simple Mode:
    - Quick Check panel
    - Quick Summary and Outputs
  - Advanced Mode:
    - Retains detailed “Content Chunks” and “Content Questions” panels
- Other Tabs (Advanced Mode only):
  - Analysis (Coverage, NAP, Fact Checker)
  - Monitoring (Hallucination Detect)
  - Generation (JSON‑LD, OpenAPI, RSS, robots, sitemap, MCP, AI Manifest)
  - Agents (orchestrated runs)

---

## 7) Error Handling
- Inline banners per check in advanced panels, but Simple Mode shows summarized errors
- Keep last good output visible if re‑run fails
- ServiceStatus in header (Backend OK/warn/error)

---

## 8) Accessibility & Performance
- WCAG AA contrast, focus rings, aria labels
- Debounced auto‑run (e.g., 700ms)
- Local area spinners only
- Long outputs remain scrollable with soft wrap

---

## 9) API Mapping (unchanged)
- /content/chunks → getContentChunks(url, maxChunks)
- /content/questions → getContentQuestions({url|urls, maxItems})
- /analysis/semantic-coverage → postSemanticCoverage(myUrl, competitors[], topN)
- /analysis/nap-audit → postNapAudit(url)
- /analysis/fact-check → postFactCheck(claim, contextUrls[])
- /monitoring/hallucination-detect → postHallucinationDetect(generatedText, brandUrl)
- /generation/jsonld → generateJsonLd(url, schemaType)
- /generation/openapi → generateOpenAPI(url)
- /generation/rss → generateRSS(url)
- /generation/robots → generateRobots(url)
- /generation/sitemap → generateSitemap(url)
- /generation/mcp-config → generateMcpConfig(url)
- /generation/ai-manifest → generateAIManifest(url)
- /agents/runner → postAgentRunner(goal, urls[], constraints)

---

## 10) Acceptance Checklist
- [x] Simple Mode default with Quick Check only
- [x] Advanced Mode toggle reveals all panels
- [x] Presets for checks (SEO Basic, Dev Artifacts, Full)
- [x] Optional Auto‑run on domain change (debounced)
- [x] Quick Summary with status/notes
- [x] ResultCard for artifacts (copy/download, code fence stripping)
- [x] Service Status indicator in header
- [x] CORS configured for local dev (localhost:* & env FRONTEND_ORIGIN(S))
- [ ] Optional: Bundle export (zip of artifacts) in a follow‑up PR
- [ ] Optional: Post‑run chaining selector (Level 2 automation)

---

## 11) Implementation Status (this repo)
- Implemented:
  - components/ResultCard.tsx
  - components/ServiceStatus.tsx
  - components/StickyInputs.tsx
  - views/ProjectDetailView.tsx:
    - Simple vs Advanced toggle in header
    - Quick Check (domain, checkboxes, presets, Run, Auto‑run)
    - Quick Summary with statuses
    - Advanced panels intact (hidden in Simple mode)
  - backend/main.py: CORS liberalized for localhost ports and FRONTEND_ORIGIN(S)
- Next:
  - Optional “Export bundle” (client‑side zip)
  - Optional “Post‑run chaining” on Quick Check
  - Minor polish (iconography on summary chips)

---

## 12) Dev Run
Use the script to launch both services:
\`\`\`
python scripts/dev.py --frontend-port 3000
\`\`\`
- Backend: http://localhost:8000/api/v1/health
- Frontend: http://localhost:3000/ (falls back to :3001 if busy)

Ensure backend/.env (or ENV) includes:
- FRONTEND_ORIGIN=http://localhost:3000
- Or FRONTEND_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

End of document.
