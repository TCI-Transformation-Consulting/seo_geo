import type { ClientProject } from "../types"

const API_BASE_URL = "/api"

type Json = Record<string, any>

const getToken = () => {
  try {
    return localStorage.getItem("auth_token") || ""
  } catch {
    return ""
  }
}

async function postJson<T>(path: string, body: Json, timeoutMs = 60000): Promise<T> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const token = getToken()
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(t)
    if (!res.ok) {
      const contentType = res.headers.get("content-type") || ""
      let msg = `Request failed (${res.status})`
      try {
        if (contentType.includes("application/json")) {
          const err = await res.json()
          const detail = err?.detail ?? err?.error ?? err?.message ?? err
          if (typeof detail === "string") {
            msg = detail
          } else if (Array.isArray(detail)) {
            msg = detail.map((d: any) => d?.msg || d?.message || JSON.stringify(d)).join("; ")
          } else {
            msg = JSON.stringify(detail)
          }
        } else {
          msg = await res.text()
        }
      } catch {}
      throw new Error(msg)
    }
    return await res.json()
  } catch (e: any) {
    clearTimeout(t)
    if (e.name === "AbortError") {
      throw new Error("Request timed out. Please try again.")
    }
    throw e
  }
}

async function getJson<T>(path: string, timeoutMs = 10000): Promise<T> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${API_BASE_URL}${path}`, { headers, signal: controller.signal })
    clearTimeout(t)
    if (!res.ok) {
      const contentType = res.headers.get("content-type") || ""
      let msg = `Request failed (${res.status})`
      try {
        if (contentType.includes("application/json")) {
          const err = await res.json()
          const detail = err?.detail ?? err?.error ?? err?.message ?? err
          if (typeof detail === "string") {
            msg = detail
          } else if (Array.isArray(detail)) {
            msg = detail.map((d: any) => d?.msg || d?.message || JSON.stringify(d)).join("; ")
          } else {
            msg = JSON.stringify(detail)
          }
        } else {
          msg = await res.text()
        }
      } catch {}
      throw new Error(msg)
    }
    return await res.json()
  } catch (e: any) {
    clearTimeout(t)
    if (e.name === "AbortError") {
      throw new Error("Request timed out. Please try again.")
    }
    throw e
  }
}

export interface InitialScanResponse {
  success: boolean
  url: string
  score: number
  issues: {
    critical: number
    warnings: number
    suggestions: number
  }
  findings: Array<{
    id: string
    title: string
    category: string
    severity: "critical" | "warning" | "suggestion"
    description: string
  }>
  opportunities: Array<{
    id: string
    title: string
    description: string
    impact: "high" | "medium" | "low"
  }>
  technicalStatus: {
    schema: boolean
    schemaTypes: string[]
    schemaCompleteness: number
    robotsTxt: boolean
    robotsAiOptimized: boolean
    robotsNoindex: boolean
    robotsNoarchive: boolean
    aiCrawlerDirectives: string[]
    sitemap: boolean
    sitemapUrls: number
    rssFeed: boolean
    rssItems: number
    llmsTxtFound: boolean
    aiManifestFound: boolean
    mcpConfigFound: boolean
    openApiFound: boolean
    agentReadiness: boolean
    visibilityBaseline: number
    canonicalUrl: string
    metaTagCount: number
    headings: string
  }
  contentAnalysis: {
    title: string
    description: string
    hasFaqContent: boolean
    headingStructure: { h1: number; h2: number; h3: number }
  }
  competitors: Array<{ name: string; url: string; description: string }>
  competitorComparison: string
  crawledAt: string
}

export const initialScan = async (url: string): Promise<InitialScanResponse> => {
  return postJson<InitialScanResponse>("/initial-scan", { url }, 90000)
}

export const scanWebsite = async (url: string): Promise<ClientProject> => {
  return postJson<ClientProject>("/scan", { url }, 60000)
}

// Auth
export const login = async (email: string, password: string) => {
  const res = await postJson<{ access_token: string; token_type: string; expires_in: number }>(
    "/auth/login",
    { email, password },
    15000,
  )
  try {
    localStorage.setItem("auth_token", res.access_token)
  } catch {}
  return res
}

// Health
export const getHealth = async () => getJson<{ status: string; version: string }>("/health")

// Content & Questions
export const getContentChunks = async (url: string, maxChunks = 20) =>
  postJson<{ url: string; chunks: Array<{ question: string; answer: string }> }>(
    "/content/chunks",
    { url, max_chunks: maxChunks },
    60000,
  )

export const getContentQuestions = async (args: { url?: string; urls?: string[]; maxItems?: number }) => {
  const payload: any = {}
  if (args.urls?.length) payload.urls = args.urls
  if (args.url) payload.url = args.url
  payload.max_items = args.maxItems ?? 50
  return postJson<{ items: Array<{ question: string; cluster?: string }> }>("/content/questions", payload, 60000)
}

export const getReviewResponse = async (reviewText: string) =>
  postJson<{ reply: string }>("/content/review-response", { review_text: reviewText })

// Analysis
export const postSemanticCoverage = async (myUrl: string, competitors: string[], topN = 10) =>
  postJson<{
    gaps: Array<{
      topic: string
      suggested_h2?: string
      suggested_paragraph?: string
      references?: Array<{ competitor: string; page?: string }>
    }>
  }>("/analysis/semantic-coverage", { my_url: myUrl, competitors, top_n: topN }, 120000)

export const postNapAudit = async (url: string) =>
  postJson<{ nap: { name?: string | null; address?: string | null; phone?: string | null } }>(
    "/analysis/nap-audit",
    { url },
    30000,
  )

export const postFactCheck = async (claim: string, contextUrls: string[]) =>
  postJson<{ verdict: "true" | "false" | "uncertain"; evidence: Array<{ citation?: string; snippet?: string }> }>(
    "/analysis/fact-check",
    { claim, context_urls: contextUrls },
    60000,
  )

export const postCompetitorSearch = async (query: string, domain: string, maxResults = 5) => {
  const domainNormalized = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`
  return postJson<{
    competitors: Array<{ name: string; url: string; description: string }>
    search_queries: string[]
    citations: Array<{ title: string; url: string }>
  }>("/analysis/competitor-search", { query, domain: domainNormalized, max_results: maxResults }, 60000)
}

export const searchCompetitorsGrounded = async (domain: string, industry?: string, maxResults = 5) => {
  const domainNormalized = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`
  return postJson<{
    competitors: Array<{ name: string; url: string; description: string; relevance_score?: number }>
    analysis: string
    sources: Array<{ title: string; url: string }>
  }>(
    "/analysis/competitor-search",
    { query: industry || domain, domain: domainNormalized, max_results: maxResults },
    60000,
  )
}

export const postGroundedAnalysis = async (domain: string, topic?: string) =>
  postJson<{ summary: string; search_queries: string[]; sources: Array<{ title: string; url: string }> }>(
    "/analysis/grounded-competitor-analysis",
    { domain, topic },
    60000,
  )

// New Analysis Endpoint Functions
export const postTopicRecognition = async (url: string, content: string, title?: string) =>
  postJson<{
    primaryTopic: string
    secondaryTopics: string[]
    industry: string
    contentType: string
    keywords: string[]
    entities: Array<{ name: string; type: string }>
    sentiment: string
    targetAudience: string
    confidence: number
  }>("/analysis/topic-recognition", { url, content, title }, 60000)

export const postContentGap = async (
  url: string,
  content: string,
  title?: string,
  industry?: string,
  competitors?: string[],
) =>
  postJson<{
    gaps: Array<{
      type: string
      title: string
      description: string
      impact: string
      recommendation: string
      estimatedEffort: string
    }>
    missingQuestions: string[]
    missingTopics: string[]
    schemaOpportunities: string[]
    contentScore: number
    summary: string
  }>("/analysis/content-gap", { url, content, title, industry, competitors }, 60000)

export const postFactCheckAnalysis = async (url: string, content: string, title?: string) =>
  postJson<{
    claims: Array<{
      claim: string
      type: string
      verifiable: boolean
      confidence: number
      issue: string | null
      recommendation: string
    }>
    overallCredibility: number
    citationsMissing: boolean
    sourcesNeeded: string[]
    superlativesUsed: string[]
    recommendations: string[]
    summary: string
  }>("/analysis/fact-check", { url, content, title }, 60000)

export const postAccessibilityCheck = async (url: string, html: string) =>
  postJson<{
    score: number
    issues: Array<{
      type: string
      severity: string
      count?: number
      message: string
      impact: string
      missing?: string[]
    }>
    passes: string[]
    summary: {
      totalIssues: number
      highSeverity: number
      mediumSeverity: number
      lowSeverity: number
      totalImages: number
      imagesWithAlt: number
      headingStructure: { h1: number; h2: number; h3: number }
      semanticHtml: { main: boolean; nav: boolean; article: boolean; header: boolean; footer: boolean }
    }
  }>("/analysis/accessibility-check", { url, html }, 30000)

// Monitoring
export const postHallucinationDetect = async (generatedText: string, brandUrl: string) =>
  postJson<{ findings: Array<{ statement: string; contradiction?: string; citation?: string; confidence?: number }> }>(
    "/monitoring/hallucination-detect",
    { generated_text: generatedText, brand_url: brandUrl },
    60000,
  )

// Agents
export const postAgentRunner = async (
  goal: string,
  urls: string[] = [],
  constraints?: { allowlist?: string[]; max_calls?: number },
) =>
  postJson<{ steps: Array<{ tool: string; args: any; output_summary?: string }>; summary: string }>(
    "/agents/runner",
    { goal, urls, constraints },
    120000,
  )

// Generation - all with real backend calls
export const generateJsonLd = async (
  url: string,
  schemaType: "Organization" | "Product" | "FAQ" | "HowTo" | "Article",
) => postJson<{ jsonld: string }>("/generation/jsonld", { url, schema_type: schemaType }, 60000)

export const generateOpenAPI = async (url: string) =>
  postJson<{ openapi: string }>("/generation/openapi", { url }, 90000)

export const generateRSS = async (url: string) => postJson<{ rss: string }>("/generation/rss", { url }, 60000)

export const generateRobots = async (url: string) => postJson<{ robots: string }>("/generation/robots", { url }, 30000)

export const generateSitemap = async (url: string) =>
  postJson<{ sitemap: string }>("/generation/sitemap", { url }, 60000)

export const generateMcpConfig = async (url: string) =>
  postJson<{ config: string }>("/generation/mcp-config", { url }, 60000)

export const generateAIManifest = async (url: string) =>
  postJson<{ manifest: string }>("/generation/ai-manifest", { url }, 60000)

export const generateLocalBusinessSchema = async (url: string, content?: string, napData?: any) =>
  postJson<{ localbusiness: string; filename: string }>(
    "/generation/localbusiness-schema",
    { url, content, napData },
    60000,
  )

export const generateLlmsTxt = async (url: string) =>
  postJson<{ llms_txt: string }>("/generation/llms", { url }, 60000)

// Comprehensive LLM-based analysis (Scrape → LLM Parse → Structured Data)
export const runComprehensiveAnalysis = async (url: string) =>
  postJson<{
    business: {
      name: string | null
      legalForm: string | null
      address: string | null
      phone: string | null
      email: string | null
      website: string | null
      foundOnPage: string | null
      _validation?: { valid: boolean; confidence: number; reasoning: string }
    }
    seo: {
      title: string | null
      description: string | null
      h1: string[]
      h1Assessment: string | null
      keyMessages: string[]
    }
    content: {
      primaryTopic: string | null
      secondaryTopics: string[]
      industry: string | null
      contentType: string | null
      targetAudience: string | null
      tone: string | null
      language: string | null
    }
    entities: {
      people: { name: string; role: string }[]
      organizations: string[]
      locations: string[]
      products: string[]
      keywords: string[]
    }
    schema: {
      detected: string[]
      recommended: string[]
      reasoning: string | null
    }
    credibility: {
      hasImpressum: boolean
      hasContact: boolean
      hasSocialProof: boolean
      trustSignals: string[]
      score: number
    }
    contentQuality: {
      hasUniqueContent: boolean
      hasFAQ: boolean
      hasPricing: boolean
      hasTestimonials: boolean
      missingElements: string[]
      score: number
    }
    _meta: {
      scannedPages: string[]
      pagesCount: number
      contentLength: number
      analyzedAt: string
    }
  }>("/analysis/comprehensive", { url }, 120000)

export const runPackageAnalysis = async (
  url: string,
  packageId: string,
  onProgress?: (step: string, status: "running" | "done" | "error", result?: any) => void,
) => {
  const results: Record<string, any> = {}

  // Always run scan first
  onProgress?.("scan", "running")
  try {
    results.scan = await scanWebsite(url)
    onProgress?.("scan", "done", results.scan)
  } catch (e: any) {
    onProgress?.("scan", "error", { error: e.message })
    throw e
  }

  // Content analysis
  onProgress?.("content_chunks", "running")
  try {
    results.content_chunks = await getContentChunks(url, 10)
    onProgress?.("content_chunks", "done", results.content_chunks)
  } catch (e: any) {
    results.content_chunks = { error: e.message }
    onProgress?.("content_chunks", "error", results.content_chunks)
  }

  // NAP Audit
  onProgress?.("nap_audit", "running")
  try {
    results.nap_audit = await postNapAudit(url)
    onProgress?.("nap_audit", "done", results.nap_audit)
  } catch (e: any) {
    results.nap_audit = { error: e.message }
    onProgress?.("nap_audit", "error", results.nap_audit)
  }

  // Generate files based on package
  const generations: Array<{ id: string; fn: () => Promise<any>; field: string }> = []

  if (packageId !== "quick_check") {
    generations.push(
      { id: "jsonld_organization", fn: () => generateJsonLd(url, "Organization"), field: "jsonld" },
      { id: "robots", fn: () => generateRobots(url), field: "robots" },
      { id: "sitemap", fn: () => generateSitemap(url), field: "sitemap" },
    )
  }

  if (packageId === "business_complete" || packageId === "ai_ready") {
    generations.push(
      { id: "jsonld_faq", fn: () => generateJsonLd(url, "FAQ"), field: "jsonld" },
      { id: "rss", fn: () => generateRSS(url), field: "rss" },
    )
  }

  if (packageId === "ai_ready") {
    generations.push(
      { id: "openapi", fn: () => generateOpenAPI(url), field: "openapi" },
      { id: "mcp_config", fn: () => generateMcpConfig(url), field: "config" },
      { id: "ai_manifest", fn: () => generateAIManifest(url), field: "manifest" },
    )
  }

  for (const gen of generations) {
    onProgress?.(gen.id, "running")
    try {
      const res = await gen.fn()
      results[gen.id] = res[gen.field as keyof typeof res] || res
      onProgress?.(gen.id, "done", results[gen.id])
    } catch (e: any) {
      results[gen.id] = { error: e.message }
      onProgress?.(gen.id, "error", results[gen.id])
    }
  }

  return results
}

// Batch scan (depth selector → real number of pages)
export const scanBatch = async (url: string, maxPages: number) =>
  postJson<{
    root: string
    total_discovered: number
    processed: number
    chunks_ok: number
    nap_ok: number
    errors_count: number
    errors?: string[]
    sample: Array<{
      url: string
      chunks_preview?: Array<{ question: string; answer: string }>
      nap?: any
    }>
  }>("/scan/batch", { url, max_pages: maxPages }, 120000)

// Schema audit per page (JSON-LD completeness)
export const postSchemaAudit = async (args: { url?: string; html?: string }) =>
  postJson<{
    rawSchemas: any[]
    schemasFound: Array<{
      type: string
      completeness: number
      missingRequired: string[]
      missingRecommended: string[]
      issues: string[]
      valid: boolean
    }>
    missingSchemas: Array<{ type: string; reason: string; impact: string }>
    overallScore: number
    recommendations: string[]
    googleRichResultsEligible: string[]
    summary: string
  }>("/analysis/schema-audit", args, 45000)
