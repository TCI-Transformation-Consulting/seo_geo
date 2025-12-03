# AI Visibility Check - Technische Dokumentation

## Überblick

Der **AI Visibility Check** misst, wie gut eine Marke/Website von KI-Systemen "gefunden" und verstanden wird. Es gibt zwei unabhängige Tests, die zu einem Gesamt-Score kombiniert werden.

---

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│           AI Visibility Framework (2-Layer-Test)            │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌─────────────────┐                 ┌─────────────────┐
│  UNGROUNDED     │                 │    GROUNDED     │
│  Brand Recall   │                 │  Answerability  │
│                 │                 │                 │
│  Weight: 40%    │                 │  Weight: 60%    │
└─────────────────┘                 └─────────────────┘
        │                                     │
        │                                     │
        ▼                                     ▼
  0-100 Score                           0-100 Score
  (0, 50, 100)                          (% answered)
        │                                     │
        └─────────────────┬───────────────────┘
                          ▼
                  Final Score (0-100)
                  Grade (A, B, C, D, F)
```

---

## 1. UNGROUNDED Brand Recall Test

### Zweck
Testet, ob das LLM die Marke **ohne zusätzlichen Kontext** kennt (aus Trainingsdaten).

### Wie es funktioniert

#### Schritt 1: LLM-Abfrage OHNE Firmenname
```python
# Backend: gemini_service.py, Zeile 643-647
query = f"""Welche Unternehmen sind führend in der Branche "{industry}" im Bereich {service_hint}?
{f'Speziell in {location}?' if location else ''}

Nenne die wichtigsten Anbieter und erkläre kurz, warum sie relevant sind."""
```

**Wichtig**: Der Firmenname wird NICHT erwähnt! Das LLM muss ihn aus eigenem Wissen nennen.

#### Schritt 2: Response-Analyse
```python
# Zeile 658-663
response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=contents,
    config={
        "system_instruction": system_instruction,
        "response_mime_type": "application/json",
    }
)

data = json.loads(response.text)
```

Das LLM antwortet mit JSON:
```json
{
  "mentioned_companies": ["AKQA", "R/GA", "Wieden+Kennedy", ...],
  "target_company_mentioned": false,
  "mention_type": "none",  // "explicit", "indirect", oder "none"
  "context": "...",
  "reasoning": "..."
}
```

#### Schritt 3: Score-Berechnung
```python
# Zeile 678-683
score = 0
if mention_type == "explicit":
    score = 2  # 100 Punkte
elif mention_type == "indirect":
    score = 1  # 50 Punkte
# none = 0  # 0 Punkte
```

### Bewertung
- **2 Punkte (100%)**: Firma wurde explizit als führend genannt
- **1 Punkt (50%)**: Firma wurde indirekt erwähnt
- **0 Punkte (0%)**: Firma nicht genannt → **Brand ist nicht in LLM-Trainingsdaten**

### Beispiel: Neue Werte GmbH
```
Query: "Welche Unternehmen sind führend in der Branche 'Agentur' im Bereich Websites?"

LLM Response:
- AKQA
- R/GA
- Wieden+Kennedy
- Droga5
- ...

✗ Neue Werte GmbH: NICHT GENANNT → Score: 0/100
```

---

## 2. GROUNDED Answerability Test

### Zweck
Testet, ob das LLM Fragen **mit Website-Kontext** beantworten kann.

### Wie es funktioniert

#### Schritt 1: Content-Profil erstellen
```python
# Zeile 726-751
profile_text = f"""
UNTERNEHMEN: {business_name}
BRANCHE: {industry}
HAUPTTHEMA: {primary_topic}
ZIELGRUPPE: {target_audience}

DIENSTLEISTUNGEN:
- Markenentwicklung
- Strategieberatung
- Content-Erstellung

KERNBOTSCHAFTEN:
- Digitalisierung
- Nachhaltigkeit
- Zukunftsgestaltung

MITARBEITER:
- Matt Wichmann (Geschäftsführer)
- ...
"""
```

Dieses Profil kommt aus der **Comprehensive Analysis** (gecrawlte Website-Daten).

#### Schritt 2: Test-Fragen generieren
```python
# generate_user_questions() - Zeile 547-630
questions = [
    "Was macht die Neue Werte GmbH genau?",
    "Wie unterstützt die Neue Werte GmbH Unternehmen bei der Digitalisierung?",
    "Kann die Neue Werte GmbH Vereine bei der Kommunikation unterstützen?",
    "Wie hilft die Neue Werte GmbH bei der Zukunftsgestaltung?",
    "Welche Kompetenzen hat die Neue Werte GmbH im Bereich Nachhaltigkeit?",
    "Bietet die Neue Werte GmbH auch Beratung für kleine Unternehmen an?"
]
```

Diese Fragen werden **LLM-generiert** basierend auf Branche und Content.

#### Schritt 3: Fragen mit Kontext beantworten
```python
# Zeile 770-785
prompt = f"""
UNTERNEHMENSPROFIL:
{profile_text}

FRAGE: {question}

Beantworte diese Frage NUR mit den oben stehenden Informationen.
"""

response = llm.generate(prompt)
```

**System-Anweisung** (Zeile 758-768):
```
Du bist ein KI-Assistent der Fragen über ein Unternehmen beantwortet.
Nutze AUSSCHLIESSLICH die bereitgestellten Informationen.
Erfinde NICHTS hinzu.

Antworte als JSON:
{
  "answerable": true/false,
  "answer_quality": "complete" | "partial" | "none",
  "answer": "Deine Antwort (max 100 Wörter)",
  "missing_info": "Was fehlt" oder null
}
```

#### Schritt 4: Pro Frage bewerten
```python
# Zeile 790-805
quality = data.get("answer_quality")

if quality == "complete":
    score = 2  # Frage vollständig beantwortet
elif quality == "partial":
    score = 1  # Frage teilweise beantwortet
else:
    score = 0  # Frage nicht beantwortet

results.append({
    "question": question,
    "answerable": data.get("answerable"),
    "answer_quality": quality,
    "score": score,
    "max_score": 2,
    "missing_info": data.get("missing_info"),
    "answer_preview": answer[:150]
})
```

#### Schritt 5: Gesamt-Prozentsatz berechnen
```python
# Zeile 817-818
max_score = len(questions) * 2  # 6 Fragen × 2 Punkte = 12
percentage = (total_score / max_score * 100)
```

### Beispiel: Neue Werte GmbH
```
Frage 1: "Was macht die Neue Werte GmbH genau?"
→ answer_quality: "complete"
→ Score: 2/2 ✓

Frage 2: "Wie unterstützt ... bei Digitalisierung?"
→ answer_quality: "partial"
→ missing_info: "Details zu konkreten Dienstleistungen fehlen"
→ Score: 1/2 ⚠️

Frage 3: "Kann ... Vereine unterstützen?"
→ answer_quality: "complete"
→ Score: 2/2 ✓

...

Gesamt: 8/12 Punkte = 66.7%
```

---

## 3. Final Score Berechnung

### Formel
```python
# Zeile 858-865
ungrounded_score = (ungrounded_points / 2) * 100  # 0/2 → 0%
grounded_score = grounded_percentage              # 66.7%

total_score = (0.4 × ungrounded_score) + (0.6 × grounded_score)
```

### Gewichtung
- **40% Ungrounded** (Brand Recall): Ist die Marke bekannt?
- **60% Grounded** (Answerability): Kann die Website Fragen beantworten?

**Begründung**: Content-Qualität ist wichtiger als reine Brand-Bekanntheit, da man Content direkt verbessern kann.

### Beispiel: Neue Werte GmbH
```
Ungrounded: 0/100 (0%)
Grounded:   66.7%

Total = (0.4 × 0) + (0.6 × 66.7)
      = 0 + 40.02
      = 40/100

Grade: C
```

### Grading
```python
# Zeile 867-880
if total_score >= 80: grade = "A"  # Excellent
elif total_score >= 60: grade = "B"  # Good
elif total_score >= 40: grade = "C"  # Moderate
elif total_score >= 20: grade = "D"  # Poor
else: grade = "F"  # Very Poor
```

---

## 4. Priority Actions

```python
# Zeile 888-902
priority_actions = []

if ungrounded_score < 50:
    priority_actions.append(
        "Increase brand presence through PR, content marketing, and industry mentions"
    )

if grounded_score < 60:
    priority_actions.append(
        "Expand website content to answer common user questions"
    )

if len(content_gaps) > 3:
    priority_actions.append(
        f"Address {len(content_gaps)} major content gaps"
    )
```

---

## API Endpoint Flow

```
POST /api/analysis/ai-visibility-full
    ↓
[1] Comprehensive Analysis (analyze_page_comprehensive)
    → Scrape Website → Extract: NAP, Topics, Entities
    ↓
[2] Generate Test Questions (generate_user_questions)
    → LLM erstellt 6-8 relevante Fragen basierend auf Branche
    ↓
[3] Ungrounded Test (ai_visibility_ungrounded)
    → LLM-Abfrage OHNE Firmenname → Check if mentioned
    ↓
[4] Grounded Test (ai_visibility_grounded)
    → LLM beantwortet Fragen MIT Website-Kontext
    ↓
[5] Calculate Final Score (calculate_ai_visibility_score)
    → 40% Ungrounded + 60% Grounded → Grade
    ↓
Return JSON Response
```

---

## Warum dieser Ansatz?

### Vorteile
1. **Zwei unabhängige Metriken**: Brand Awareness vs. Content Quality
2. **LLM-basiert**: Testet echte AI-Performance, nicht nur Keywords
3. **Actionable Insights**: Zeigt konkrete Content-Gaps
4. **Realistic**: Testet tatsächliche User-Fragen

### Limitationen
1. **LLM-Variabilität**: Verschiedene LLMs können unterschiedlich antworten
2. **Trainingsdaten-Bias**: Ungrounded Test hängt von LLM-Training ab
3. **Zeitpunkt**: Marken-Bekanntheit kann sich ändern

---

## Technische Details

### LLM: Gemini 2.0 Flash
- Schnell und kostengünstig
- JSON-Output-Modus für strukturierte Antworten
- System Instructions für präzise Kontrolle

### Timeout-Handling
- Jeder LLM-Call hat implizites Timeout
- Bei Fehler: Score = 0 für betroffene Frage

### Content-Profile
- Max 10 Produkte/Services
- Max 5 Key Messages
- Max 5 Personen
- Optimiert für Token-Effizienz

---

## Future Improvements

1. **Competitive Advantage Bonus**: +10% wenn vor Konkurrenten genannt
2. **Multi-LLM Testing**: Test mit GPT, Claude, Gemini parallel
3. **Historical Tracking**: Score-Entwicklung über Zeit
4. **Custom Questions**: User kann eigene Test-Fragen definieren
5. **Language Support**: Automatische Sprach-Erkennung für Fragen

---

## Code-Referenzen

- **Ungrounded Test**: `/app/backend/app/services/gemini_service.py` (Zeile 630-693)
- **Grounded Test**: `/app/backend/app/services/gemini_service.py` (Zeile 696-838)
- **Score Calculation**: `/app/backend/app/services/gemini_service.py` (Zeile 841-910)
- **API Endpoint**: `/app/backend/app/api/endpoints.py` (Zeile 1978-2095)
- **Frontend Display**: `/app/frontend/views/ProjectDetailView.tsx` (Zeile 718-863)
