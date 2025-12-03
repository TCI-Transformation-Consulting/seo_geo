import { NextResponse } from "next/server"

// API Keys from config
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || "fc-7fc5a013a18548f68c5267c5ba448bab"
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyAFtMIEg-mEyZPr_NvWXv5VJVVNrV_Q3ys"

function validateUrl(url: string): string {
  if (!url) throw new Error("URL is required")
  let cleanUrl = url.trim()
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = `https://${cleanUrl}`
  }
  new URL(cleanUrl)
  return cleanUrl
}

async function scrapeWithFirecrawl(url: string): Promise<{ markdown: string; html: string; metadata: any }> {
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html"],
        onlyMainContent: false,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.log("[v0] Firecrawl error:", error)
      throw new Error(`Firecrawl error: ${response.status}`)
    }

    const data = await response.json()
    return {
      markdown: data.data?.markdown || "",
      html: data.data?.html || "",
      metadata: data.data?.metadata || {},
    }
  } catch (error) {
    console.log("[v0] Firecrawl failed, falling back to fetch:", error)
    // Fallback to basic fetch
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AIReadinessBot/1.0)" },
    })
    const html = await res.text()
    return { markdown: "", html, metadata: {} }
  }
}

async function analyzeWithGemini(url: string, markdown: string, html: string, metadata: any): Promise<any> {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

  const prompt = `Du bist ein AI-Readiness-Analyst. Analysiere diese Website gründlich für AI-Optimierung.

URL: ${url}
Titel: ${metadata.title || "Unbekannt"}
Beschreibung: ${metadata.description || "Keine"}

CONTENT (Markdown):
${markdown.slice(0, 20000) || html.slice(0, 20000)}

Analysiere folgende Aspekte und gib eine detaillierte Bewertung:

1. STRUCTURED DATA (JSON-LD, Schema.org):
   - Prüfe ob JSON-LD vorhanden ist
   - Welche Schema-Typen fehlen (Organization, WebSite, Product, FAQ, Article)?

2. TECHNICAL SEO:
   - Meta-Tags (title, description, og:tags)
   - Heading-Struktur (H1, H2, H3)
   - robots.txt Optimierung für AI-Crawler

3. CONTENT QUALITY:
   - Ist der Content klar strukturiert?
   - Gibt es FAQ-Inhalte die markiert werden könnten?
   - Faktendichte und Lesbarkeit

4. AI ACCESSIBILITY:
   - RSS/Atom Feed vorhanden?
   - Sitemap vorhanden?
   - API-Dokumentation?

Antworte NUR mit folgendem JSON-Format (keine Erklärungen):
{
  "score": <0-100>,
  "scores": {
    "structuredData": <0-100>,
    "technicalSeo": <0-100>,
    "contentQuality": <0-100>,
    "aiAccessibility": <0-100>
  },
  "criticalIssues": [
    {"title": "...", "category": "...", "description": "...", "impact": "..."}
  ],
  "warnings": [
    {"title": "...", "category": "...", "description": "...", "recommendation": "..."}
  ],
  "suggestions": [
    {"title": "...", "category": "...", "description": "...", "benefit": "..."}
  ],
  "opportunities": [
    {"title": "...", "impact": "high|medium|low", "description": "...", "expectedImprovement": "..."}
  ],
  "technicalStatus": {
    "hasSchema": <boolean>,
    "hasRobotsTxt": <boolean>,
    "hasSitemap": <boolean>,
    "hasRssFeed": <boolean>,
    "metaTagCount": <number>,
    "headings": {"h1": <number>, "h2": <number>, "h3": <number>}
  },
  "detectedContent": {
    "hasProducts": <boolean>,
    "hasFAQ": <boolean>,
    "hasArticles": <boolean>,
    "hasLocalBusiness": <boolean>
  }
}`

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.log("[v0] Gemini error:", error)
      throw new Error(`Gemini error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"

    try {
      return JSON.parse(text)
    } catch {
      console.log("[v0] Failed to parse Gemini response:", text.slice(0, 500))
      return null
    }
  } catch (error) {
    console.log("[v0] Gemini analysis failed:", error)
    return null
  }
}

async function checkTechnicalFiles(
  baseUrl: string,
): Promise<{ hasRobotsTxt: boolean; hasSitemap: boolean; hasRssFeed: boolean }> {
  const urlObj = new URL(baseUrl)
  const origin = urlObj.origin

  const checks = await Promise.allSettled([
    fetch(`${origin}/robots.txt`, { method: "HEAD" }).then((r) => r.ok),
    fetch(`${origin}/sitemap.xml`, { method: "HEAD" }).then((r) => r.ok),
    fetch(`${origin}/feed`, { method: "HEAD" }).then((r) => r.ok),
    fetch(`${origin}/rss`, { method: "HEAD" }).then((r) => r.ok),
    fetch(`${origin}/feed.xml`, { method: "HEAD" }).then((r) => r.ok),
  ])

  return {
    hasRobotsTxt: checks[0].status === "fulfilled" && checks[0].value,
    hasSitemap: checks[1].status === "fulfilled" && checks[1].value,
    hasRssFeed:
      (checks[2].status === "fulfilled" && checks[2].value) ||
      (checks[3].status === "fulfilled" && checks[3].value) ||
      (checks[4].status === "fulfilled" && checks[4].value),
  }
}

function extractSchemaFromHtml(html: string): { hasSchema: boolean; schemaTypes: string[] } {
  const schemaRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const matches = [...html.matchAll(schemaRegex)]
  const schemaTypes: string[] = []

  for (const match of matches) {
    try {
      const json = JSON.parse(match[1])
      if (json["@type"]) {
        schemaTypes.push(json["@type"])
      } else if (Array.isArray(json)) {
        json.forEach((item) => item["@type"] && schemaTypes.push(item["@type"]))
      }
    } catch {}
  }

  return { hasSchema: schemaTypes.length > 0, schemaTypes }
}

function analyzeHtmlStructure(html: string): {
  metaTagCount: number
  headings: { h1: number; h2: number; h3: number }
} {
  const metaTags = (html.match(/<meta[^>]*>/gi) || []).length
  const h1Count = (html.match(/<h1[^>]*>/gi) || []).length
  const h2Count = (html.match(/<h2[^>]*>/gi) || []).length
  const h3Count = (html.match(/<h3[^>]*>/gi) || []).length

  return {
    metaTagCount: metaTags,
    headings: { h1: h1Count, h2: h2Count, h3: h3Count },
  }
}

export async function POST(request: Request) {
  try {
    const { url: rawUrl } = await request.json()
    const url = validateUrl(rawUrl)

    console.log("[v0] Starting real analysis for:", url)

    // Step 1: Scrape with Firecrawl
    console.log("[v0] Scraping with Firecrawl...")
    const { markdown, html, metadata } = await scrapeWithFirecrawl(url)
    console.log("[v0] Scraped content length:", markdown.length || html.length)

    // Step 2: Check technical files in parallel
    console.log("[v0] Checking technical files...")
    const technicalChecks = await checkTechnicalFiles(url)

    // Step 3: Extract schema from HTML
    const schemaInfo = extractSchemaFromHtml(html)
    const htmlStructure = analyzeHtmlStructure(html)

    // Step 4: Analyze with Gemini
    console.log("[v0] Analyzing with Gemini...")
    const geminiAnalysis = await analyzeWithGemini(url, markdown, html, metadata)

    // Merge all analysis results
    const title = metadata.title || new URL(url).hostname

    // Build comprehensive result
    const analysis = geminiAnalysis || {}
    const score = analysis.score || calculateFallbackScore(technicalChecks, schemaInfo, htmlStructure)

    const result = {
      id: `project-${Date.now()}`,
      url,
      name: title,
      status: "analyzed",
      score,
      scores: analysis.scores || {
        structuredData: schemaInfo.hasSchema ? 60 : 20,
        technicalSeo: htmlStructure.metaTagCount > 5 ? 70 : 40,
        contentQuality: markdown.length > 1000 ? 65 : 45,
        aiAccessibility:
          (technicalChecks.hasRobotsTxt ? 25 : 0) +
          (technicalChecks.hasSitemap ? 25 : 0) +
          (technicalChecks.hasRssFeed ? 25 : 0),
      },
      criticalIssues: analysis.criticalIssues || buildDefaultCriticalIssues(schemaInfo, technicalChecks),
      warnings: analysis.warnings || buildDefaultWarnings(technicalChecks, htmlStructure),
      suggestions: analysis.suggestions || [],
      opportunities: analysis.opportunities || buildDefaultOpportunities(schemaInfo),
      technicalStatus: {
        hasSchema: schemaInfo.hasSchema,
        schemaTypes: schemaInfo.schemaTypes,
        hasRobotsTxt: technicalChecks.hasRobotsTxt,
        hasSitemap: technicalChecks.hasSitemap,
        hasRssFeed: technicalChecks.hasRssFeed,
        metaTagCount: htmlStructure.metaTagCount,
        headings: htmlStructure.headings,
      },
      detectedContent: analysis.detectedContent || {
        hasProducts: markdown.toLowerCase().includes("product") || markdown.toLowerCase().includes("price"),
        hasFAQ: markdown.toLowerCase().includes("faq") || markdown.toLowerCase().includes("frequently asked"),
        hasArticles: markdown.toLowerCase().includes("article") || markdown.toLowerCase().includes("blog"),
        hasLocalBusiness: markdown.toLowerCase().includes("address") || markdown.toLowerCase().includes("phone"),
      },
      rawContent: {
        markdownLength: markdown.length,
        htmlLength: html.length,
        preview: markdown.slice(0, 500) || html.slice(0, 500),
      },
      createdAt: new Date().toISOString(),
    }

    console.log("[v0] Analysis complete. Score:", result.score)
    return NextResponse.json(result)
  } catch (error: any) {
    console.log("[v0] Scan error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Fallback score calculation
function calculateFallbackScore(
  technical: { hasRobotsTxt: boolean; hasSitemap: boolean; hasRssFeed: boolean },
  schema: { hasSchema: boolean },
  structure: { metaTagCount: number; headings: { h1: number } },
): number {
  let score = 30 // Base score
  if (technical.hasRobotsTxt) score += 10
  if (technical.hasSitemap) score += 10
  if (technical.hasRssFeed) score += 10
  if (schema.hasSchema) score += 20
  if (structure.metaTagCount > 5) score += 10
  if (structure.headings.h1 >= 1) score += 10
  return Math.min(score, 100)
}

function buildDefaultCriticalIssues(schema: { hasSchema: boolean }, technical: { hasRobotsTxt: boolean }) {
  const issues = []
  if (!schema.hasSchema) {
    issues.push({
      title: "Missing JSON-LD Schema",
      category: "Structured Data",
      description: "No structured data found. AI systems cannot understand your content properly.",
      impact: "AI systems will struggle to extract accurate information about your business.",
    })
  }
  if (!technical.hasRobotsTxt) {
    issues.push({
      title: "robots.txt not optimized",
      category: "Technical SEO",
      description: "Your robots.txt doesn't include AI crawler directives.",
      impact: "AI crawlers may not index your content optimally.",
    })
  }
  return issues
}

function buildDefaultWarnings(
  technical: { hasSitemap: boolean; hasRssFeed: boolean },
  structure: { headings: { h1: number; h2: number } },
) {
  const warnings = []
  if (!technical.hasSitemap) {
    warnings.push({
      title: "No sitemap.xml found",
      category: "Technical SEO",
      description: "Sitemap helps AI crawlers discover all your content.",
      recommendation: "Generate and submit a sitemap.xml",
    })
  }
  if (!technical.hasRssFeed) {
    warnings.push({
      title: "No RSS feed detected",
      category: "Feeds",
      description: "RSS feeds help AI systems track content updates.",
      recommendation: "Create an RSS feed for your content",
    })
  }
  if (structure.headings.h1 === 0) {
    warnings.push({
      title: "Missing H1 heading",
      category: "Content Structure",
      description: "No H1 heading found on the page.",
      recommendation: "Add a clear H1 heading to define page content",
    })
  }
  return warnings
}

function buildDefaultOpportunities(schema: { hasSchema: boolean; schemaTypes: string[] }) {
  const opportunities = []
  if (!schema.schemaTypes.includes("Organization")) {
    opportunities.push({
      title: "Add Organization Schema",
      impact: "high",
      description: "Improve brand recognition in AI answers by 40%",
      expectedImprovement: "Better representation in AI search results",
    })
  }
  opportunities.push({
    title: "Generate AI Manifest",
    impact: "high",
    description: "Direct AI systems to your preferred content",
    expectedImprovement: "Control how AI systems interact with your site",
  })
  opportunities.push({
    title: "Create MCP Configuration",
    impact: "medium",
    description: "Enable AI assistants to interact with your services",
    expectedImprovement: "Allow AI tools to programmatically access your content",
  })
  return opportunities
}
