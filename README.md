# NEURO-WEB | AI Readiness Platform

<div align="center">
<img src="https://img.shields.io/badge/GEO-SEO%20AI-6366F1?style=for-the-badge" alt="GEO/SEO AI" />
<img src="https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js" alt="Next.js 14" />
<img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
<img src="https://img.shields.io/badge/Crawl4AI-Scraping-00A67E?style=for-the-badge" alt="Crawl4AI" />
<img src="https://img.shields.io/badge/Gemini-AI-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini AI" />
</div>

## Overview

**NEURO-WEB** is an AI Readiness Platform that helps businesses optimize their web presence for AI systems like ChatGPT, Gemini, Perplexity, and other LLM-based search/answer engines. It performs comprehensive audits combining traditional SEO checks with modern **GEO (Generative Engine Optimization)** analysis.

## Features & Functionalities

### 1. Website Scanning & Analysis

#### Initial Scan (`/api/v1/initial-scan`)
Performs a comprehensive scan of any website and checks:

**SEO Checks:**
- Title tag (presence, length optimization)
- Meta description (presence, character count)
- H1 heading analysis (count, multiple H1 detection)
- Meta tag density
- Canonical URL detection
- NoIndex/NoArchive directives

**GEO Artifact Detection:**
| Artifact | Description | Status Check |
|----------|-------------|--------------|
| `robots.txt` | Crawler control file | ✅ Found/Not Found + AI directives |
| `sitemap.xml` | Site structure map | ✅ Found + URL count |
| `RSS/Atom Feed` | Content syndication | ✅ Found + item count |
| `llms.txt` | LLM access policies | ✅ Found (well-known paths) |
| `ai-manifest.json` | AI integration manifest | ✅ Found |
| `mcp.json` | MCP configuration | ✅ Found |
| `openapi.json` | API specification | ✅ Found |
| `JSON-LD Schema` | Structured data | ✅ Types detected + completeness |

**AI Crawler Detection:**
- GPTBot, Anthropic-AI, PerplexityBot
- Google-Extended, CCBot, BingBot
- Custom AI crawler directives

### 2. AI-Powered Analysis (Gemini Integration)

#### Content Chunking (`/api/v1/content/chunks`)
- Extracts key topics from webpage content
- Returns Q&A format chunks (H2-style questions with concise answers)
- Useful for FAQ generation and knowledge base building

#### Question Extraction (`/api/v1/content/questions`)
- Identifies implicit user questions from content
- Clusters questions by topic
- Helps identify content gaps

#### Review Response Generation (`/api/v1/content/review-response`)
- Generates professional, empathetic replies to customer reviews
- Multilingual support (German/English)
- Solution-oriented, concise responses

#### Topic Recognition (`/api/v1/analysis/topic-recognition`)
- Identifies primary and secondary topics
- Industry classification
- Keyword extraction
- Entity recognition
- Target audience detection

#### Content Gap Analysis (`/api/v1/analysis/content-gap`)
- Identifies missing core sections (Services, References, About, Pricing, Contact, FAQ, Blog)
- Suggests missing questions that should be answered
- Schema opportunities
- Content score calculation

#### Semantic Coverage Analysis (`/api/v1/analysis/semantic-coverage`)
- Compares your content against competitors
- Identifies topic gaps
- Provides suggested H2 headlines and paragraph content
- References competitor sources

#### NAP Audit (`/api/v1/analysis/nap-audit`)
- Extracts Name, Address, Phone (NAP) data
- Validates business information consistency
- Critical for local SEO and AI understanding

#### Schema Audit (`/api/v1/analysis/schema-audit`)
- Parses all JSON-LD on a page
- Checks completeness for common types:
  - Organization
  - Product
  - FAQPage
  - Article
  - LocalBusiness
- Reports missing required/recommended fields
- Google Rich Results eligibility check

#### Fact Checking (`/api/v1/analysis/fact-check`)
- Verifies claims against provided context
- Returns verdict: `true`, `false`, or `uncertain`
- Provides evidence with citations

### 3. Monitoring & Quality Assurance

#### Hallucination Detection (`/api/v1/monitoring/hallucination-detect`)
- Compares AI-generated text against brand content
- Identifies potential factual errors
- Helps maintain content accuracy

### 4. Competitor Analysis

#### Grounded Competitor Search (`/api/v1/analysis/competitor-search`)
- Uses Gemini with Google Search grounding
- Finds direct competitors based on domain/topic
- Returns competitor URLs, descriptions, relevance scores
- Fallback to DuckDuckGo/Bing SERP

#### Grounded Competitor Analysis (`/api/v1/analysis/grounded-competitor-analysis`)
- Comprehensive market analysis with real-time web data
- Analyzes competitor strengths/weaknesses
- Identifies market trends
- Content strategy insights
- Inline citations from sources

### 5. Artifact Generation

#### JSON-LD Schema Generation (`/api/v1/generation/jsonld`)
- Generates valid Schema.org JSON-LD
- Supported types: Organization, Product, FAQ, HowTo, Article
- Uses page content for accurate data

#### OpenAPI Specification (`/api/v1/generation/openapi`)
- Generates OpenAPI spec from page content
- Useful for API documentation

#### RSS Feed Generation (`/api/v1/generation/rss`)
- Creates RSS feed from content
- Enables content syndication

#### robots.txt Generation (`/api/v1/generation/robots`)
- Generates optimized robots.txt
- Includes AI crawler directives

#### Sitemap Generation (`/api/v1/generation/sitemap`)
- Creates XML sitemap
- Improves discovery by search engines and AI

#### MCP Config Generation (`/api/v1/generation/mcp-config`)
- Generates MCP (Model Context Protocol) configuration
- Enables AI agent integration

#### AI Manifest Generation (`/api/v1/generation/ai-manifest`)
- Creates ai-manifest.json
- Describes AI integration capabilities

### 6. Site-Wide Operations

#### URL Enumeration (`/api/v1/site/urls`)
- Discovers all URLs for a domain
- Uses sitemap.xml (including nested indexes)
- Fallback to Crawl4AI crawling

#### Batch Scanning (`/api/v1/scan/batch`)
- Processes multiple pages
- Content chunking across pages
- NAP extraction from multiple sources

### 7. AI Agent Runner

#### Agent Runner (`/api/v1/agents/runner`)
- Executes goal-oriented web scraping tasks
- Constraint-based execution
- Tool calls with output summaries

## Scoring System

The platform calculates an **AI Readiness Score** (0-100) based on:

1. **Structure Score** - HTML structure, headings, semantic markup
2. **Structured Data Score** - JSON-LD presence and completeness
3. **Content Score** - Quality and comprehensiveness
4. **Technical Score** - robots.txt, sitemap, canonical URLs
5. **GEO Artifact Score** - AI-specific files (llms.txt, ai-manifest, mcp.json)

## Issue Classification

| Severity | Description |
|----------|-------------|
| **Critical** | Must-fix issues blocking AI visibility |
| **Warning** | Important issues affecting discoverability |
| **Suggestion** | Optimization opportunities |

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Radix UI
- **Backend**: FastAPI (Python), Pydantic
- **AI**: Google Gemini (gemini-2.0-flash, gemini-2.5-pro, gemini-2.5-flash)
- **Web Scraping**: Crawl4AI (v0.7.x)
- **Parsing**: BeautifulSoup, HTTPX

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Gemini API Key

### Setup

1. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt
crawl4ai-setup  # Install browser dependencies
```

2. **Configure Environment**
```bash
# backend/.env
GEMINI_API_KEY=your_gemini_api_key
AUTH_SECRET=your_secret_key
```

3. **Frontend Setup**
```bash
cd frontend
yarn install
```

4. **Run Services**
```bash
# Backend
cd backend && uvicorn server:app --host 0.0.0.0 --port 8001

# Frontend
cd frontend && yarn dev
```

## Default Login Credentials

| Email | Password |
|-------|----------|
| mw@neuewerte.de | testuser123 |
| db@neuewerte.de | testuser123 |
| oleg.seifert@tci-partners.com | testuser123 |

## API Endpoints Summary

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **Health** | `/api/v1/health` | GET | Service health check |
| **Scanning** | `/api/v1/scan` | POST | Full site scan |
| | `/api/v1/initial-scan` | POST | Quick initial scan |
| | `/api/v1/scan/batch` | POST | Batch page processing |
| **Content** | `/api/v1/content/chunks` | POST | Extract content chunks |
| | `/api/v1/content/questions` | POST | Extract user questions |
| | `/api/v1/content/review-response` | POST | Generate review reply |
| **Analysis** | `/api/v1/analysis/topic-recognition` | POST | Topic & keyword analysis |
| | `/api/v1/analysis/content-gap` | POST | Content gap analysis |
| | `/api/v1/analysis/semantic-coverage` | POST | Semantic coverage vs competitors |
| | `/api/v1/analysis/nap-audit` | POST | NAP extraction |
| | `/api/v1/analysis/schema-audit` | POST | Schema.org audit |
| | `/api/v1/analysis/fact-check` | POST | Fact verification |
| | `/api/v1/analysis/competitor-search` | POST | Find competitors |
| | `/api/v1/analysis/grounded-competitor-analysis` | POST | Deep competitor analysis |
| **Monitoring** | `/api/v1/monitoring/hallucination-detect` | POST | AI hallucination check |
| **Generation** | `/api/v1/generation/jsonld` | POST | Generate JSON-LD |
| | `/api/v1/generation/openapi` | POST | Generate OpenAPI spec |
| | `/api/v1/generation/rss` | POST | Generate RSS feed |
| | `/api/v1/generation/robots` | POST | Generate robots.txt |
| | `/api/v1/generation/sitemap` | POST | Generate sitemap.xml |
| | `/api/v1/generation/mcp-config` | POST | Generate MCP config |
| | `/api/v1/generation/ai-manifest` | POST | Generate AI manifest |
| **Site** | `/api/v1/site/urls` | POST | Enumerate site URLs |
| **Agents** | `/api/v1/agents/runner` | POST | Run AI agent task |

## GEO Artifacts Explained

### llms.txt
A text file at `/.well-known/llms.txt` that guides LLM access and usage policies for your website.

### ai-manifest.json
A JSON file describing your site's AI integration capabilities, data access policies, and machine-readable metadata.

### mcp.json
Model Context Protocol configuration file exposing tools and endpoints that AI agents can consume.

### OpenAPI Specification
Standard API documentation that AI systems can parse to understand available endpoints and data structures.

## License

Proprietary - All rights reserved.

## Support

For support and inquiries, contact the development team.
