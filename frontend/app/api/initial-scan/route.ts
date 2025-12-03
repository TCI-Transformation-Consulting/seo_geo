import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

// API keys
// const FIRECRAWL_API_KEY = "fc-7fc5a013a18548f68c5267c5ba448bab" // Removed FIRECRAWL_API_KEY - using direct fetch instead

const BROWSER_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
]

async function fetchWithRetry(
  url: string,
  options: RequestInit & { timeout?: number } = {},
  maxRetries = 2,
): Promise<Response | null> {
  const timeout = options.timeout || 5000

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const userAgent = BROWSER_USER_AGENTS[attempt % BROWSER_USER_AGENTS.length]

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      // Remove any external signal and timeout to prevent conflicts
      const { signal: _externalSignal, timeout: _timeout, ...restOptions } = options

      let response: Response
      try {
        response = await fetch(url, {
          ...restOptions,
          headers: {
            ...options.headers,
            "User-Agent": userAgent,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
          },
          signal: controller.signal,
          cache: "no-store",
        })
      } catch (fetchError) {
        clearTimeout(timeoutId)
        // Network error or fetch rejection - continue to next attempt
        continue
      }

      clearTimeout(timeoutId)

      if (!response.ok) {
        try {
          // Consume the body to prevent the runtime logging it
          await response.text()
        } catch {
          // Ignore body consumption errors
        }
        // For 403/429, try with a different User-Agent
        if (response.status === 403 || response.status === 429) {
          continue
        }
        // For other non-OK responses (404, 500, etc), return null gracefully
        return null
      }

      return response
    } catch {
      // Any other error - try next User-Agent
      continue
    }
  }

  return null
}

async function silentFetch(
  url: string,
  timeout = 3000,
): Promise<{ ok: boolean; text: string; contentType: string; status: number }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    let response: Response
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": BROWSER_USER_AGENTS[0],
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: controller.signal,
        cache: "no-store",
      })
    } catch {
      clearTimeout(timeoutId)
      return { ok: false, text: "", contentType: "", status: 0 }
    }

    clearTimeout(timeoutId)

    if (response.status === 404) {
      return { ok: false, text: "", contentType: "", status: 404 }
    }

    // For other non-OK responses, silently consume the body
    if (!response.ok) {
      try {
        await response.text()
      } catch {
        // Ignore
      }
      return { ok: false, text: "", contentType: response.headers.get("content-type") || "", status: response.status }
    }

    // Only read body for successful responses
    const text = await response.text().catch(() => "")

    return {
      ok: true,
      text,
      contentType: response.headers.get("content-type") || "",
      status: response.status,
    }
  } catch {
    return { ok: false, text: "", contentType: "", status: 0 }
  }
}

type CheckStatus = "found" | "not_found" | "check_failed"

interface CompetitorScanResult {
  name: string
  url: string
  description: string
  score: number
  reason: string
  artifactChecks: {
    jsonLdSchema: { status: CheckStatus; types: string[] }
    robotsTxt: { status: CheckStatus; hasAiDirectives: boolean }
    sitemap: { status: CheckStatus; urlCount: number }
    rssFeed: { status: CheckStatus }
    llmsTxt: { status: CheckStatus }
    aiManifest: { status: CheckStatus }
    mcpConfig: { status: CheckStatus }
    openApi: { status: CheckStatus }
  }
  advantages: string[]
  crawledSuccessfully: boolean
  isBenchmark?: boolean
  artifactsFoundCount?: number
  artifactsFoundPercentage?: number
}

// Industry benchmarks for score context
const INDUSTRY_BENCHMARKS = {
  ecommerce: { average: 42, top25: 68, top10: 85 },
  saas: { average: 51, top25: 72, top10: 88 },
  media: { average: 38, top25: 61, top10: 79 },
  local_business: { average: 28, top25: 52, top10: 71 },
  general: { average: 35, top25: 58, top10: 78 },
}

function validateUrl(url: string): string {
  let validUrl = url.trim()
  if (!validUrl.startsWith("http://") && !validUrl.startsWith("https://")) {
    validUrl = "https://" + validUrl
  }
  try {
    new URL(validUrl)
    return validUrl
  } catch {
    throw new Error("Invalid URL format")
  }
}

// Safe wrapper for async operations
async function safeCheck<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

async function crawlWithFirecrawl(url: string): Promise<{
  status: CheckStatus
  html: string
  markdown: string
  metadata: Record<string, unknown>
  links: string[]
  error?: string
}> {
  const problematicDomains = [
    "linkedin.com",
    "facebook.com",
    "instagram.com",
    "twitter.com",
    "x.com",
    "tiktok.com",
    "pinterest.com",
    "reddit.com",
    "amazon.com",
    "xing.com",
  ]

  const urlHost = new URL(url).hostname.toLowerCase()
  const isProblematicDomain = problematicDomains.some((domain) => urlHost.includes(domain))

  if (isProblematicDomain) {
    return await basicFetch(url)
  }

  try {
    // Removed FIRECRAWL_API_KEY usage
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Authorization: `Bearer ${FIRECRAWL_API_KEY}`, // Removed FIRECRAWL_API_KEY
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, // Use environment variable if available
      },
      body: JSON.stringify({
        url,
        formats: ["html", "markdown"],
        includeTags: ["title", "meta", "h1", "h2", "h3", "p", "script", "a"],
        waitFor: 3000,
      }),
    })

    if (response.status === 403) {
      return await basicFetch(url)
    }

    if (!response.ok) {
      return await basicFetch(url)
    }

    const data = await response.json()
    return {
      status: "found",
      html: data.data?.html || "",
      markdown: data.data?.markdown || "",
      metadata: data.data?.metadata || {},
      links: data.data?.links || [],
    }
  } catch {
    return await basicFetch(url)
  }
}

async function basicFetch(url: string): Promise<{
  status: CheckStatus
  html: string
  markdown: string
  metadata: Record<string, unknown>
  links: string[]
  error?: string
}> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AIReadinessBot/1.0; +https://example.com/bot)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    })

    if (!response.ok) {
      return {
        status: "check_failed",
        html: "",
        markdown: "",
        metadata: {},
        links: [],
        error: `HTTP ${response.status}: Could not access website`,
      }
    }

    const html = await response.text()

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)

    return {
      status: "found",
      html,
      markdown: "",
      metadata: {
        title: titleMatch?.[1] || "",
        description: descMatch?.[1] || "",
      },
      links: [],
    }
  } catch (error) {
    return {
      status: "check_failed",
      html: "",
      markdown: "",
      metadata: {},
      links: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

async function checkSeo(baseUrl: string): Promise<{
  status: CheckStatus
  title?: string
  description?: string
  canonical?: string
  ogTags?: Record<string, string>
  twitterTags?: Record<string, string>
  error?: string
}> {
  try {
    const response = await fetchWithRetry(baseUrl, {
      timeout: 10000,
    })

    if (!response) {
      return { status: "check_failed", error: "Failed to fetch the homepage" }
    }

    if (!response.ok) {
      return { status: "check_failed", error: `HTTP ${response.status}` }
    }

    const html = await response.text()
    const titleMatch = html.match(/<title>([\s\S]*)<\/title>/i)
    const descriptionMatch = html.match(/<meta name="description" content="([\s\S]*?)"/i)
    const canonicalMatch = html.match(/<link rel="canonical" href="([\s\S]*?)"/i)

    const ogTags: Record<string, string> = {}
    const ogRegex = /<meta property="og:([^"]+)" content="([^"]*)"/gi
    let ogMatch
    while ((ogMatch = ogRegex.exec(html)) !== null) {
      ogTags[ogMatch[1]] = ogMatch[2]
    }

    const twitterTags: Record<string, string> = {}
    const twitterRegex = /<meta name="twitter:([^"]+)" content="([^"]*)"/gi
    let twitterMatch
    while ((twitterMatch = twitterRegex.exec(html)) !== null) {
      twitterTags[twitterMatch[1]] = twitterMatch[2]
    }

    return {
      status: "found",
      title: titleMatch?.[1].trim() || "",
      description: descriptionMatch?.[1].trim() || "",
      canonical: canonicalMatch?.[1].trim() || "",
      ogTags,
      twitterTags,
    }
  } catch (error) {
    return {
      status: "check_failed",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

async function checkRobotsTxt(baseUrl: string): Promise<{
  status: CheckStatus
  content: string
  hasSitemap: boolean
  hasDisallow: boolean
  error?: string
  hasAiDirectives?: boolean
  blockedBots?: string[]
  allowedBots?: string[]
}> {
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).toString()
    const result = await silentFetch(robotsUrl, 5000)

    if (!result.ok) {
      if (result.status === 404) {
        return { status: "not_found", content: "", hasSitemap: false, hasDisallow: false }
      }
      return {
        status: "check_failed",
        content: "",
        hasSitemap: false,
        hasDisallow: false,
        error: result.status ? `HTTP ${result.status}` : "Failed to fetch robots.txt",
      }
    }

    const content = result.text
    const hasSitemap = content.toLowerCase().includes("sitemap:")
    const hasDisallow = content.toLowerCase().includes("disallow:")

    // Check for AI directives
    let hasAiDirectives = false
    const blockedBots: string[] = []
    const allowedBots: string[] = []

    let currentBlock: { userAgent: string; disallows: string[]; allows: string[] } | null = null

    content.split("\n").forEach((line) => {
      line = line.trim()
      if (!line || line.startsWith("#")) return

      if (line.toLowerCase().startsWith("user-agent:")) {
        if (currentBlock) {
          if (
            currentBlock.userAgent.toLowerCase().includes("ai") ||
            currentBlock.userAgent.toLowerCase().includes("gpt")
          ) {
            hasAiDirectives = true
            if (currentBlock.disallows.length > 0) {
              blockedBots.push(`${currentBlock.userAgent} (Disallowed: ${currentBlock.disallows.join(", ")})`)
            }
            if (currentBlock.allows.length > 0) {
              allowedBots.push(`${currentBlock.userAgent} (Allowed: ${currentBlock.allows.join(", ")})`)
            }
          }
        }
        currentBlock = { userAgent: line.substring("User-agent:".length).trim(), disallows: [], allows: [] }
      } else if (line.toLowerCase().startsWith("disallow:") && currentBlock) {
        currentBlock.disallows.push(line.substring("Disallow:".length).trim())
      } else if (line.toLowerCase().startsWith("allow:") && currentBlock) {
        currentBlock.allows.push(line.substring("Allow:".length).trim())
      }
    })

    if (currentBlock) {
      if (currentBlock.userAgent.toLowerCase().includes("ai") || currentBlock.userAgent.toLowerCase().includes("gpt")) {
        hasAiDirectives = true
        if (currentBlock.disallows.length > 0) {
          blockedBots.push(`${currentBlock.userAgent} (Disallowed: ${currentBlock.disallows.join(", ")})`)
        }
        if (currentBlock.allows.length > 0) {
          allowedBots.push(`${currentBlock.userAgent} (Allowed: ${currentBlock.allows.join(", ")})`)
        }
      }
    }

    return {
      status: "found",
      content,
      hasSitemap,
      hasDisallow,
      hasAiDirectives,
      blockedBots,
      allowedBots,
    }
  } catch (error) {
    return {
      status: "check_failed",
      content: "",
      hasSitemap: false,
      hasDisallow: false,
      hasAiDirectives: false,
      blockedBots: [],
      allowedBots: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

async function checkSitemap(baseUrl: string): Promise<{
  status: CheckStatus
  urlCount: number
  sitemapUrls: string[]
  error?: string
  url?: string
}> {
  try {
    const sitemapPaths = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap/sitemap.xml"]

    for (const path of sitemapPaths) {
      const sitemapUrl = new URL(path, baseUrl).toString()
      const result = await silentFetch(sitemapUrl, 5000)

      if (!result.ok) {
        continue
      }

      const content = result.text

      if (content.includes("<urlset") || content.includes("<sitemapindex")) {
        const urlMatches = content.match(/<loc>(.*?)<\/loc>/g)
        const urls = urlMatches?.map((m) => m.replace(/<\/?loc>/g, "")) || []
        return { status: "found", urlCount: urls.length, sitemapUrls: urls.slice(0, 10), url: sitemapUrl }
      }
    }

    return { status: "not_found", urlCount: 0, sitemapUrls: [] }
  } catch (error) {
    return {
      status: "check_failed",
      urlCount: 0,
      sitemapUrls: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

async function checkRssFeed(baseUrl: string): Promise<{
  status: CheckStatus
  feedUrl?: string
  itemCount: number
  error?: string
}> {
  const feedPaths = ["/feed", "/rss", "/feed.xml", "/rss.xml", "/atom.xml"]

  for (const path of feedPaths) {
    const feedUrl = new URL(path, baseUrl).toString()
    const result = await silentFetch(feedUrl, 5000)

    if (!result.ok) {
      continue
    }

    const content = result.text
    if (content.includes("<rss") || content.includes("<feed") || content.includes("<channel")) {
      const itemMatches = content.match(/<item>|<entry>/g)
      return { status: "found", feedUrl, itemCount: itemMatches?.length || 0 }
    }
  }

  return { status: "not_found", itemCount: 0 }
}

async function checkLlmsTxt(baseUrl: string): Promise<{
  status: CheckStatus
  content: string
  hasInstructions: boolean
  error?: string
}> {
  try {
    const llmsUrl = new URL("/llms.txt", baseUrl).toString()
    const result = await silentFetch(llmsUrl, 5000)

    if (!result.ok) {
      return { status: "not_found", content: "", hasInstructions: false }
    }

    if (result.contentType.includes("text/html")) {
      return { status: "not_found", content: "", hasInstructions: false }
    }

    const content = result.text

    if (
      content.trim().startsWith("<!DOCTYPE") ||
      content.trim().startsWith("<html") ||
      content.trim().startsWith("<HTML")
    ) {
      return { status: "not_found", content: "", hasInstructions: false }
    }

    const hasInstructions =
      content.length > 50 &&
      (content.toLowerCase().includes("llm") ||
        content.toLowerCase().includes("ai") ||
        content.toLowerCase().includes("model") ||
        content.toLowerCase().includes("instruction"))

    return { status: "found", content, hasInstructions }
  } catch {
    return { status: "not_found", content: "", hasInstructions: false }
  }
}

async function checkAiManifest(baseUrl: string): Promise<{
  status: CheckStatus
  content: string
  version?: string
  error?: string
}> {
  const manifestPaths = ["/.well-known/ai-manifest.json", "/ai-manifest.json", "/.well-known/ai-plugin.json"]

  for (const path of manifestPaths) {
    const manifestUrl = new URL(path, baseUrl).toString()
    const result = await silentFetch(manifestUrl, 5000)

    if (!result.ok) {
      continue
    }

    if (!result.contentType.includes("application/json") && !result.contentType.includes("text/plain")) {
      continue
    }

    const content = result.text

    if (content.trim().startsWith("<!DOCTYPE") || content.trim().startsWith("<html")) {
      continue
    }

    try {
      const parsed = JSON.parse(content)
      const version = parsed.api?.version || parsed.version
      return { status: "found", content, version }
    } catch {
      continue
    }
  }

  return { status: "not_found", content: "" }
}

async function checkMcpConfig(baseUrl: string): Promise<{
  status: CheckStatus
  content: string
  tools?: string[]
  error?: string
}> {
  const mcpPaths = ["/.well-known/mcp.json", "/mcp.json"]

  for (const path of mcpPaths) {
    const mcpUrl = new URL(path, baseUrl).toString()
    const result = await silentFetch(mcpUrl, 5000)

    if (!result.ok) {
      continue
    }

    if (!result.contentType.includes("application/json") && !result.contentType.includes("text/plain")) {
      continue
    }

    const content = result.text

    if (content.trim().startsWith("<!DOCTYPE") || content.trim().startsWith("<html")) {
      continue
    }

    try {
      const parsed = JSON.parse(content)
      const tools = parsed.tools || []
      return { status: "found", content, tools }
    } catch {
      continue
    }
  }

  return { status: "not_found", content: "" }
}

async function checkOpenApi(baseUrl: string): Promise<{
  status: CheckStatus
  content: string
  version?: string
  error?: string
}> {
  const openApiPaths = ["/openapi.json", "/swagger.json", "/api-docs", "/api/openapi.json", "/api/swagger.json"]

  for (const path of openApiPaths) {
    try {
      const apiUrl = new URL(path, baseUrl).toString()
      const result = await silentFetch(apiUrl, 5000)

      if (!result.ok || !result.text) {
        continue
      }

      const contentType = result.contentType.toLowerCase()
      if (contentType.includes("text/html")) {
        continue
      }

      const content = result.text

      const trimmedContent = content.trim()
      if (
        trimmedContent.startsWith("<!DOCTYPE") ||
        trimmedContent.startsWith("<html") ||
        trimmedContent.startsWith("<HTML")
      ) {
        continue
      }

      try {
        const parsed = JSON.parse(content)
        if (parsed.openapi || parsed.swagger) {
          return {
            status: "found",
            content,
            version: parsed.openapi || parsed.swagger,
          }
        }
      } catch {
        continue
      }
    } catch {
      // Skip this path on any error
      continue
    }
  }

  return { status: "not_found", content: "" }
}

function extractJsonLdSchemas(html: string): { types: string[]; schemas: unknown[] } {
  const schemas: unknown[] = []
  const types: string[] = []

  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      schemas.push(parsed)

      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item["@type"]) {
            types.push(Array.isArray(item["@type"]) ? item["@type"].join(", ") : item["@type"])
          }
        })
      } else if (parsed["@type"]) {
        types.push(Array.isArray(parsed["@type"]) ? parsed["@type"].join(", ") : parsed["@type"])
      } else if (parsed["@graph"]) {
        parsed["@graph"].forEach((item: Record<string, unknown>) => {
          if (item["@type"]) {
            const itemType = item["@type"]
            types.push(Array.isArray(itemType) ? itemType.join(", ") : String(itemType))
          }
        })
      }
    } catch {
      // Invalid JSON-LD
    }
  }

  return { types: [...new Set(types)], schemas }
}

function extractMetaTags(html: string): Record<string, string> {
  const metaTags: Record<string, string> = {}
  const metaRegex = /<meta[^>]*>/gi
  let match

  while ((match = metaRegex.exec(html)) !== null) {
    const nameMatch = match[0].match(/(?:name|property)=["']([^"']+)["']/i)
    const contentMatch = match[0].match(/content=["']([^"']+)["']/i)

    if (nameMatch && contentMatch) {
      metaTags[nameMatch[1]] = contentMatch[1]
    }
  }

  return metaTags
}

function extractHeadings(html: string): { h1: string[]; h2: string[]; h3: string[] } {
  const h1s: string[] = []
  const h2s: string[] = []
  const h3s: string[] = []

  const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi
  const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/gi

  let match
  while ((match = h1Regex.exec(html)) !== null) {
    h1s.push(match[1].replace(/<[^>]+>/g, "").trim())
  }
  while ((match = h2Regex.exec(html)) !== null) {
    h2s.push(match[1].replace(/<[^>]+>/g, "").trim())
  }
  while ((match = h3Regex.exec(html)) !== null) {
    h3s.push(match[1].replace(/<[^>]+>/g, "").trim())
  }

  return { h1: h1s, h2: h2s, h3: h3s }
}

async function analyzeContentWithAI(
  url: string,
  html: string,
  markdown: string,
  metadata: Record<string, unknown>,
): Promise<{
  topicRecognition: {
    primaryTopic: string
    secondaryTopics: string[]
    industry: string
    contentType: string
    keywords: string[]
    entities: Array<{ name: string; type: string }>
    targetAudience: string
  }
  contentGap: {
    missingTopics: string[]
    missingQuestions: string[]
    contentScore: number
    recommendations: string[]
  }
  napData: {
    name: string | null
    address: string | null
    phone: string | null
    email: string | null
    isComplete: boolean
  }
  factCheck: {
    claims: Array<{ claim: string; verifiable: boolean; issue: string | null }>
    overallCredibility: number
    recommendations: string[]
  }
  userQuestions: string[]
}> {
  const content = markdown || html.replace(/<[^>]+>/g, " ").substring(0, 15000)
  const title = (metadata.title as string) || ""
  const domain = new URL(url).hostname.replace("www.", "")

  const defaultResponse = {
    topicRecognition: {
      primaryTopic: "Unknown",
      secondaryTopics: [],
      industry: "general",
      contentType: "webpage",
      keywords: [],
      entities: [],
      targetAudience: "General audience",
    },
    contentGap: {
      missingTopics: [],
      missingQuestions: [],
      contentScore: 50,
      recommendations: ["Unable to analyze content"],
    },
    napData: {
      name: null,
      address: null,
      phone: null,
      email: null,
      isComplete: false,
    },
    factCheck: {
      claims: [],
      overallCredibility: 50,
      recommendations: [],
    },
    userQuestions: [],
  }

  if (content.trim().length < 100) {
    return defaultResponse
  }

  try {
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `You are an AI content analyzer. Analyze this website thoroughly.

URL: ${url}
Domain: ${domain}
Title: ${title}
Content (first 12000 chars): ${content.substring(0, 12000)}

IMPORTANT: Extract as much information as possible from the content. Even if information is limited, make educated guesses based on the domain name and any available text.

Respond with ONLY a valid JSON object (no markdown, no explanation):
{
  "topicRecognition": {
    "primaryTopic": "main topic based on content and domain name",
    "secondaryTopics": ["related topic 1", "related topic 2"],
    "industry": "one of: ecommerce, saas, media, local_business, education, healthcare, finance, technology, general",
    "contentType": "landing page, blog, product page, service page, corporate website, etc.",
    "keywords": ["key", "words", "from", "content"],
    "entities": [{"name": "company or brand name", "type": "organization"}],
    "targetAudience": "who this website is for"
  },
  "contentGap": {
    "missingTopics": ["important topics not covered"],
    "missingQuestions": ["questions visitors might have that aren't answered"],
    "contentScore": 65,
    "recommendations": ["specific improvement suggestions"]
  },
  "napData": {
    "name": "business name if found, otherwise null",
    "address": "full address if found, otherwise null",
    "phone": "phone number if found, otherwise null",
    "email": "email if found, otherwise null",
    "isComplete": false
  },
  "factCheck": {
    "claims": [{"claim": "any factual claims made", "verifiable": true, "issue": null}],
    "overallCredibility": 70,
    "recommendations": ["how to improve credibility"]
  },
  "userQuestions": ["what would someone ask an AI about this business?", "another likely question"]
}`,
    })

    let jsonText = text.trim()

    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    }

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    const parsed = JSON.parse(jsonText)

    return {
      topicRecognition: {
        primaryTopic: parsed.topicRecognition?.primaryTopic || defaultResponse.topicRecognition.primaryTopic,
        secondaryTopics: parsed.topicRecognition?.secondaryTopics || [],
        industry: parsed.topicRecognition?.industry || "general",
        contentType: parsed.topicRecognition?.contentType || "webpage",
        keywords: parsed.topicRecognition?.keywords || [],
        entities: parsed.topicRecognition?.entities || [],
        targetAudience: parsed.topicRecognition?.targetAudience || "General audience",
      },
      contentGap: {
        missingTopics: parsed.contentGap?.missingTopics || [],
        missingQuestions: parsed.contentGap?.missingQuestions || [],
        contentScore: parsed.contentGap?.contentScore || 50,
        recommendations: parsed.contentGap?.recommendations || [],
      },
      napData: {
        name: parsed.napData?.name || null,
        address: parsed.napData?.address || null,
        phone: parsed.napData?.phone || null,
        email: parsed.napData?.email || null,
        isComplete: parsed.napData?.isComplete || false,
      },
      factCheck: {
        claims: parsed.factCheck?.claims || [],
        overallCredibility: parsed.factCheck?.overallCredibility || 50,
        recommendations: parsed.factCheck?.recommendations || [],
      },
      userQuestions: parsed.userQuestions || [],
    }
  } catch {
    return defaultResponse
  }
}

async function buildCompanyProfile(
  url: string,
  html: string,
  markdown: string,
  metadata: Record<string, unknown>,
  napData: { name: string | null; address: string | null; phone: string | null; email: string | null },
  topicRecognition: { primaryTopic: string; secondaryTopics: string[]; industry: string; targetAudience: string },
): Promise<{
  companyName: string
  industry: string
  services: string[]
  location: { city: string | null; region: string | null; country: string | null }
  targetMarket: string
  uniqueSellingPoints: string[]
  businessType: string
}> {
  const domain = new URL(url).hostname.replace("www.", "")
  const content = markdown || html.replace(/<[^>]+>/g, " ").substring(0, 10000)
  const title = (metadata.title as string) || ""

  try {
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Analyze this company/website to build a detailed profile for competitor identification.

URL: ${url}
Domain: ${domain}
Title: ${title}
Known Business Name: ${napData.name || "Unknown"}
Known Address: ${napData.address || "Not found"}
Known Phone: ${napData.phone || "Not found"}
Industry Hint: ${topicRecognition.industry}
Primary Topic: ${topicRecognition.primaryTopic}

Content excerpt:
${content.substring(0, 8000)}

Build a comprehensive company profile. Extract or infer:
1. Company name (from content, domain, or NAP data)
2. Industry/sector
3. Main services or products offered
4. Location (city, region/state, country) - extract from address, phone area code, content mentions
5. Target market (B2B, B2C, local, regional, national, international)
6. Unique selling points or differentiators
7. Business type (service provider, retailer, manufacturer, agency, nonprofit, media, etc.)

Return ONLY valid JSON:
{
  "companyName": "Company Name",
  "industry": "specific industry like digital sustainability, web development, local plumbing",
  "services": ["service 1", "service 2", "service 3"],
  "location": {
    "city": "City name or null",
    "region": "State/Region or null",
    "country": "Country or null"
  },
  "targetMarket": "local, regional, national, or international",
  "uniqueSellingPoints": ["what makes them different"],
  "businessType": "type of business"
}`,
    })

    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned)

    return {
      companyName: parsed.companyName || napData.name || domain,
      industry: parsed.industry || topicRecognition.industry,
      services: parsed.services || [],
      location: {
        city: parsed.location?.city || null,
        region: parsed.location?.region || null,
        country: parsed.location?.country || null,
      },
      targetMarket: parsed.targetMarket || "general",
      uniqueSellingPoints: parsed.uniqueSellingPoints || [],
      businessType: parsed.businessType || "business",
    }
  } catch {
    return {
      companyName: napData.name || domain,
      industry: topicRecognition.industry,
      services: [],
      location: { city: null, region: null, country: null },
      targetMarket: "general",
      uniqueSellingPoints: [],
      businessType: "business",
    }
  }
}

async function identifyCompetitorsWithSearch(
  url: string,
  companyProfile: {
    companyName: string
    industry: string
    services: string[]
    location: { city: string | null; region: string | null; country: string | null }
    targetMarket: string
    uniqueSellingPoints: string[]
    businessType: string
  },
): Promise<
  Array<{
    name: string
    url: string
    description: string
    reason: string
    competitorType: string
  }>
> {
  const domain = new URL(url).hostname.replace("www.", "")

  const locationParts = [companyProfile.location.city, companyProfile.location.region, companyProfile.location.country]
    .filter(Boolean)
    .join(", ")

  const servicesStr = companyProfile.services.slice(0, 5).join(", ") || companyProfile.industry

  const searchContext = `
Company Profile:
- Name: ${companyProfile.companyName}
- Domain: ${domain}
- Industry: ${companyProfile.industry}
- Services: ${servicesStr}
- Location: ${locationParts || "Not specified"}
- Target Market: ${companyProfile.targetMarket}
- Business Type: ${companyProfile.businessType}
- Unique Selling Points: ${companyProfile.uniqueSellingPoints.join(", ") || "Not specified"}
`

  console.log("[v0] Starting competitor search for:", domain)
  console.log("[v0] Company profile:", JSON.stringify(companyProfile, null, 2))

  try {
    const { text } = await generateText({
      model: "google/gemini-2.0-flash-001",
      providerOptions: {
        google: {
          useSearchGrounding: true,
        },
      },
      prompt: `Find direct competitors for this company. Use web search to find REAL, currently active competitors.

${searchContext}

COMPETITOR SEARCH CRITERIA:
1. SAME LOCATION: If this is a local/regional business, find competitors in ${locationParts || "the same area"}
2. SAME INDUSTRY: Must be in "${companyProfile.industry}" or closely related field
3. SAME SERVICES: Offering similar services: ${servicesStr}
4. SAME TARGET MARKET: Targeting ${companyProfile.targetMarket} customers
5. SIMILAR SIZE: Similar business type (${companyProfile.businessType})

For each competitor, identify:
- Their exact business name and website URL
- What services they offer that compete
- Why they are a direct competitor (be specific about overlap)
- Competitor type: "direct" (same services, same location), "indirect" (related services), or "aspirational" (larger player in same industry)

Return ONLY valid JSON array with 3-5 competitors:
[
  {
    "name": "Competitor Company Name",
    "url": "https://their-website.com",
    "description": "What they do and their main services",
    "reason": "Specific reason why they compete - mention shared location, services, or target market",
    "competitorType": "direct"
  }
]

IMPORTANT:
- Do NOT include ${domain} or ${companyProfile.companyName}
- Only include REAL companies with working websites
- Prioritize competitors in ${locationParts || "the same geographic market"} first
- If local business, focus on LOCAL competitors`,
    })

    console.log("[v0] Gemini competitor search raw response:", text?.substring(0, 500))

    let competitors: Array<{
      name: string
      url: string
      description: string
      reason: string
      competitorType: string
    }> = []

    try {
      const parsed = JSON.parse(text || "[]")
      competitors = Array.isArray(parsed) ? parsed : parsed.competitors || []
      console.log("[v0] Parsed competitors count:", competitors.length)
      console.log(
        "[v0] Competitor URLs:",
        competitors.map((c) => c.url),
      )
    } catch (parseError) {
      console.log("[v0] Failed to parse competitor JSON:", parseError)
      // Fallback to Claude if Gemini parsing fails
      try {
        const { text: claudeText } = await generateText({
          model: "anthropic/claude-sonnet-4-20250514",
          prompt: `Based on your knowledge, identify direct competitors for this company.

${searchContext}

COMPETITOR SEARCH CRITERIA:
1. SAME LOCATION: If local/regional business in ${locationParts || "unknown location"}, find competitors in that area
2. SAME INDUSTRY: Must be in "${companyProfile.industry}" industry
3. SAME SERVICES: Offering similar: ${servicesStr}
4. SAME TARGET: Targeting ${companyProfile.targetMarket} market

Find 3-5 real competitors. For local businesses, prioritize local competitors.

Return ONLY valid JSON array:
[
  {
    "name": "Competitor Name",
    "url": "https://competitor-website.com",
    "description": "What they do",
    "reason": "Why they compete - mention shared location/services/market",
    "competitorType": "direct"
  }
]

Do NOT include ${domain}. Only real companies with actual websites.`,
        })

        const cleaned = claudeText.replace(/```json\n?|\n?```/g, "").trim()
        const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
        const parsedClaude = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned)
        competitors = Array.isArray(parsedClaude) ? parsedClaude : []
        console.log("[v0] Claude fallback competitors count:", competitors.length)
        console.log(
          "[v0] Claude fallback competitor URLs:",
          competitors.map((c) => c.url),
        )
      } catch (claudeError) {
        console.log("[v0] Claude fallback failed:", claudeError instanceof Error ? claudeError.message : claudeError)
        return [] // Return empty if both fail
      }
    }

    return competitors.slice(0, 5).map((c) => ({
      name: c.name || "Unknown",
      url: c.url || "",
      description: c.description || "",
      reason: c.reason || "",
      competitorType: c.competitorType || "direct",
    }))
  } catch (error) {
    console.log("[v0] Competitor search error:", error instanceof Error ? error.message : error)
    return []
  }
}

async function preScanCompetitor(
  competitorUrl: string,
): Promise<{ url: string; artifactCount: number; reachable: boolean }> {
  const baseUrl = new URL(competitorUrl).origin
  let artifactCount = 0
  let reachable = false

  const checkEndpoints = [
    { path: "/robots.txt", weight: 1 },
    { path: "/sitemap.xml", weight: 1 },
    { path: "/llms.txt", weight: 2 },
    { path: "/.well-known/ai-manifest.json", weight: 2 },
    { path: "/feed", weight: 1 },
    { path: "/rss", weight: 1 },
  ]

  try {
    const homeResult = await silentFetch(baseUrl, 4000)
    reachable = homeResult.ok

    if (!reachable) {
      return { url: competitorUrl, artifactCount: 0, reachable: false }
    }

    const results = await Promise.allSettled(
      checkEndpoints.map(async ({ path, weight }) => {
        const result = await silentFetch(`${baseUrl}${path}`, 2500)

        if (!result.ok) {
          return 0
        }

        if (path.includes(".json")) {
          if (!result.contentType.includes("application/json")) {
            return 0
          }
          try {
            JSON.parse(result.text)
            return weight
          } catch {
            return 0
          }
        }

        // Avoid counting HTML error pages as valid artifacts
        if (!result.contentType.includes("text/html") || path.includes(".txt")) {
          return weight
        }

        // For paths that might return HTML (like /feed), check content
        if (path === "/feed" || path === "/rss") {
          if (result.text.includes("<rss") || result.text.includes("<feed") || result.text.includes("<channel")) {
            return weight
          }
        }
        return 0
      }),
    )

    artifactCount = results.reduce((sum, result) => {
      if (result.status === "fulfilled") {
        return sum + result.value
      }
      return sum
    }, 0)
  } catch {
    return { url: competitorUrl, artifactCount: 0, reachable: false }
  }

  return { url: competitorUrl, artifactCount, reachable }
}

async function scanCompetitorArtifacts(competitorUrl: string): Promise<{
  jsonLdSchema: { status: CheckStatus; types: string[] }
  robotsTxt: { status: CheckStatus; hasAiDirectives: boolean }
  sitemap: { status: CheckStatus; urlCount: number }
  rssFeed: { status: CheckStatus }
  llmsTxt: { status: CheckStatus }
  aiManifest: { status: CheckStatus }
  mcpConfig: { status: CheckStatus }
  openApi: { status: CheckStatus }
  crawlSuccess: boolean
}> {
  console.log("[v0] Scanning competitor artifacts for:", competitorUrl)

  const defaultNotFound = {
    jsonLdSchema: { status: "not_found" as CheckStatus, types: [] },
    robotsTxt: { status: "not_found" as CheckStatus, hasAiDirectives: false },
    sitemap: { status: "not_found" as CheckStatus, urlCount: 0 },
    rssFeed: { status: "not_found" as CheckStatus },
    llmsTxt: { status: "not_found" as CheckStatus },
    aiManifest: { status: "not_found" as CheckStatus },
    mcpConfig: { status: "not_found" as CheckStatus },
    openApi: { status: "not_found" as CheckStatus },
    crawlSuccess: false,
  }

  try {
    const [robotsResult, sitemapResult, llmsResult, aiManifestResult, mcpResult, openApiResult] = await Promise.all([
      safeCheck(() => checkRobotsTxt(competitorUrl), {
        status: "not_found" as CheckStatus,
        content: "",
        hasSitemap: false,
        hasDisallow: false,
        hasAiDirectives: false, // Initialize aiDirectives
        blockedBots: [], // Initialize blockedBots
        allowedBots: [], // Initialize allowedBots
      }),
      safeCheck(() => checkSitemap(competitorUrl), {
        status: "not_found" as CheckStatus,
        urlCount: 0,
        sitemapUrls: [],
      }),
      safeCheck(() => checkLlmsTxt(competitorUrl), {
        status: "not_found" as CheckStatus,
        content: "",
        hasInstructions: false,
      }),
      safeCheck(() => checkAiManifest(competitorUrl), { status: "not_found" as CheckStatus, content: "" }),
      safeCheck(() => checkMcpConfig(competitorUrl), { status: "not_found" as CheckStatus, content: "" }),
      safeCheck(() => checkOpenApi(competitorUrl), { status: "not_found" as CheckStatus, content: "" }),
    ])

    console.log("[v0] Artifact results for", competitorUrl, ":", {
      robots: robotsResult.status,
      sitemap: sitemapResult.status,
      llms: llmsResult.status,
    })

    let rssStatus: CheckStatus = "not_found"
    let jsonLdTypes: string[] = []
    let htmlFetchSuccess = false

    try {
      const response = await fetchWithRetry(
        competitorUrl,
        {
          redirect: "follow",
          timeout: 6000,
        },
        2,
      ) // Allow up to 2 retries for the main page

      if (response && response.ok) {
        htmlFetchSuccess = true
        const htmlContent = await response.text()
        console.log("[v0] HTML fetch success for", competitorUrl, "- content length:", htmlContent.length)
        const jsonLdData = extractJsonLdSchemas(htmlContent)
        jsonLdTypes = jsonLdData.types

        const rssResult = await safeCheck(() => checkRssFeed(competitorUrl), {
          status: "not_found" as CheckStatus,
          itemCount: 0,
        })
        rssStatus = rssResult.status
      } else {
        console.log("[v0] HTML fetch failed for", competitorUrl, "- response:", response?.status)
      }
    } catch (htmlError) {
      console.log(
        "[v0] HTML fetch error for",
        competitorUrl,
        ":",
        htmlError instanceof Error ? htmlError.message : htmlError,
      )
    }

    const anyArtifactFound =
      jsonLdTypes.length > 0 ||
      robotsResult.status === "found" ||
      sitemapResult.status === "found" ||
      rssStatus === "found" ||
      llmsResult.status === "found" ||
      aiManifestResult.status === "found" ||
      mcpResult.status === "found" ||
      openApiResult.status === "found"

    const crawlSuccess = anyArtifactFound || htmlFetchSuccess || robotsResult.status !== "check_failed"

    console.log("[v0] Crawl success for", competitorUrl, ":", crawlSuccess, "anyArtifactFound:", anyArtifactFound)

    return {
      jsonLdSchema: {
        status: jsonLdTypes.length > 0 ? "found" : "not_found",
        types: jsonLdTypes,
      },
      robotsTxt: {
        status: robotsResult.status,
        hasAiDirectives: robotsResult.hasAiDirectives,
      },
      sitemap: {
        status: sitemapResult.status,
        urlCount: sitemapResult.urlCount,
      },
      rssFeed: { status: rssStatus },
      llmsTxt: { status: llmsResult.status },
      aiManifest: { status: aiManifestResult.status },
      mcpConfig: { status: mcpResult.status },
      openApi: { status: openApiResult.status },
      crawlSuccess,
    }
  } catch (error) {
    console.log(
      "[v0] scanCompetitorArtifacts error for",
      competitorUrl,
      ":",
      error instanceof Error ? error.message : error,
    )
    return defaultNotFound
  }
}

function calculateScore(artifactChecks: Record<string, unknown>, aiAnalysis: Record<string, unknown> | null): number {
  let score = 0
  const maxScore = 100

  const jsonLd = artifactChecks.jsonLdSchema as { status?: string; types?: string[] } | undefined
  if (jsonLd?.status === "found") {
    const types = jsonLd.types || []
    score += Math.min(20, 5 + types.length * 3)
  }

  const robots = artifactChecks.robotsTxt as { status?: string; hasAiDirectives?: boolean } | undefined
  if (robots?.status === "found") {
    score += 5
    if (robots.hasAiDirectives) score += 5
  }

  const sitemap = artifactChecks.sitemap as { status?: string; urlCount?: number } | undefined
  if (sitemap?.status === "found") {
    score += 5
    if ((sitemap.urlCount || 0) > 10) score += 5
  }

  const rss = artifactChecks.rssFeed as { status?: string } | undefined
  if (rss?.status === "found") {
    score += 5
  }

  const llms = artifactChecks.llmsTxt as { status?: string } | undefined
  if (llms?.status === "found") {
    score += 15
  }

  const aiManifest = artifactChecks.aiManifest as { status?: string } | undefined
  if (aiManifest?.status === "found") {
    score += 10
  }

  const mcp = artifactChecks.mcpConfig as { status?: string } | undefined
  if (mcp?.status === "found") {
    score += 10
  }

  const openApi = artifactChecks.openApi as { status?: string } | undefined
  if (openApi?.status === "found") {
    score += 10
  }

  const analysis = aiAnalysis as { contentGap?: { contentScore?: number } } | null
  if (analysis?.contentGap?.contentScore) {
    score += Math.round(analysis.contentGap.contentScore / 10)
  }

  return Math.min(maxScore, score)
}

const KNOWN_BENCHMARK_SITES = [
  {
    url: "https://stripe.com",
    name: "Stripe",
    description: "Payment processing platform with excellent technical SEO and AI readiness",
    reason: "Industry leader in developer experience and technical documentation",
  },
  {
    url: "https://vercel.com",
    name: "Vercel",
    description: "Cloud platform for frontend developers with strong AI optimization",
    reason: "Known for excellent structured data and modern web practices",
  },
  {
    url: "https://github.com",
    name: "GitHub",
    description: "Code hosting platform with comprehensive technical artifacts",
    reason: "Industry standard for developer tools with extensive schema markup",
  },
]

async function getBenchmarkCompetitor(): Promise<{
  name: string
  url: string
  description: string
  reason: string
  artifactChecks: Awaited<ReturnType<typeof scanCompetitorArtifacts>>
  score: number
  isBenchmark: true
  crawledSuccessfully: boolean
  artifactsFoundCount: number
  artifactsFoundPercentage: number
} | null> {
  // Try each known benchmark site until we find one that works
  for (const site of KNOWN_BENCHMARK_SITES) {
    try {
      const artifacts = await scanCompetitorArtifacts(site.url)

      if (!artifacts.crawlSuccess) continue

      const foundCount = [
        artifacts.jsonLdSchema.status === "found",
        artifacts.robotsTxt.status === "found",
        artifacts.sitemap.status === "found",
        artifacts.rssFeed.status === "found",
        artifacts.llmsTxt.status === "found",
        artifacts.aiManifest.status === "found",
        artifacts.mcpConfig.status === "found",
        artifacts.openApi.status === "found",
      ].filter(Boolean).length

      // Only use if at least 4 artifacts are found (50%)
      if (foundCount >= 4) {
        const score = calculateScore(artifacts as unknown as Record<string, unknown>, null)
        return {
          name: site.name,
          url: site.url,
          description: site.description,
          reason: site.reason,
          artifactChecks: artifacts,
          score,
          isBenchmark: true,
          crawledSuccessfully: true,
          artifactsFoundCount: foundCount,
          artifactsFoundPercentage: Math.round((foundCount / 8) * 100),
        }
      }
    } catch {
      // Try next benchmark site
      continue
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const url = validateUrl(body.url)
    const baseUrl = new URL(url).origin

    const crawlResult = await crawlWithFirecrawl(url)

    if (crawlResult.status === "check_failed") {
      return NextResponse.json(
        {
          success: false,
          error: crawlResult.error || "Failed to crawl website",
        },
        { status: 400 },
      )
    }

    const [robotsResult, sitemapResult, rssResult, llmsResult, aiManifestResult, mcpResult, openApiResult] =
      await Promise.all([
        checkRobotsTxt(baseUrl),
        checkSitemap(baseUrl),
        checkRssFeed(baseUrl),
        checkLlmsTxt(baseUrl),
        checkAiManifest(baseUrl),
        checkMcpConfig(baseUrl),
        checkOpenApi(baseUrl),
      ])

    const jsonLdData = extractJsonLdSchemas(crawlResult.html)
    const metaTags = extractMetaTags(crawlResult.html)
    const headings = extractHeadings(crawlResult.html)

    const aiAnalysis = await analyzeContentWithAI(url, crawlResult.html, crawlResult.markdown, crawlResult.metadata)

    const companyProfile = await buildCompanyProfile(
      url,
      crawlResult.html,
      crawlResult.markdown,
      crawlResult.metadata,
      aiAnalysis.napData,
      aiAnalysis.topicRecognition,
    )

    const competitorsList = await identifyCompetitorsWithSearch(url, companyProfile)

    const preScanResults = await Promise.all(competitorsList.map((comp) => preScanCompetitor(comp.url)))

    const sortedCompetitors = competitorsList
      .map((comp, index) => ({
        ...comp,
        preScan: preScanResults[index],
      }))
      .sort((a, b) => {
        if (a.preScan.reachable !== b.preScan.reachable) {
          return a.preScan.reachable ? -1 : 1
        }
        return b.preScan.artifactCount - a.preScan.artifactCount
      })

    const competitorResultsWithStats: Array<CompetitorScanResult & { foundCount: number; foundPercentage: number }> =
      await Promise.all(
        sortedCompetitors.map(async (comp) => {
          const artifacts = await scanCompetitorArtifacts(comp.url)
          const compScore = calculateScore(artifacts as unknown as Record<string, unknown>, null)

          const advantages: string[] = []
          if (artifacts.jsonLdSchema.status === "found" && jsonLdData.types.length === 0) {
            advantages.push(`Has structured data (${artifacts.jsonLdSchema.types.join(", ")})`)
          }
          if (artifacts.llmsTxt.status === "found" && llmsResult.status !== "found") {
            advantages.push("Has llms.txt for AI instructions")
          }
          if (artifacts.sitemap.status === "found" && sitemapResult.status !== "found") {
            advantages.push("Has XML sitemap")
          }
          if (artifacts.rssFeed.status === "found" && rssResult.status !== "found") {
            advantages.push("Has RSS feed")
          }
          if (artifacts.openApi.status === "found" && openApiResult.status !== "found") {
            advantages.push("Has OpenAPI specification")
          }

          const foundCount = [
            artifacts.jsonLdSchema.status === "found",
            artifacts.robotsTxt.status === "found",
            artifacts.sitemap.status === "found",
            artifacts.rssFeed.status === "found",
            artifacts.llmsTxt.status === "found",
            artifacts.aiManifest.status === "found",
            artifacts.mcpConfig.status === "found",
            artifacts.openApi.status === "found",
          ].filter(Boolean).length

          const totalChecks = 8
          const foundPercentage = foundCount / totalChecks

          return {
            name: comp.name,
            url: comp.url,
            description: comp.description,
            reason: comp.reason,
            score: compScore,
            artifactChecks: artifacts,
            advantages,
            crawledSuccessfully: artifacts.crawlSuccess,
            foundCount,
            foundPercentage,
          }
        }),
      )

    const benchmarkThreshold = 0.6

    const benchmarkCandidate = competitorResultsWithStats
      .filter((c) => c.crawledSuccessfully && c.foundPercentage >= benchmarkThreshold)
      .sort((a, b) => b.foundCount - a.foundCount)[0]

    let knownBenchmark: Awaited<ReturnType<typeof getBenchmarkCompetitor>> = null
    if (!benchmarkCandidate || benchmarkCandidate.foundCount < 4) {
      knownBenchmark = await getBenchmarkCompetitor()
    }

    const finalCompetitorResults: CompetitorScanResult[] = competitorResultsWithStats.map((comp) => ({
      name: comp.name,
      url: comp.url,
      description: comp.description,
      reason: comp.reason,
      score: comp.score,
      artifactChecks: comp.artifactChecks,
      advantages: comp.advantages,
      crawledSuccessfully: comp.crawledSuccessfully,
      isBenchmark: !knownBenchmark && benchmarkCandidate?.url === comp.url,
      artifactsFoundCount: comp.foundCount,
      artifactsFoundPercentage: Math.round(comp.foundPercentage * 100),
    }))

    if (knownBenchmark) {
      finalCompetitorResults.unshift({
        name: knownBenchmark.name,
        url: knownBenchmark.url,
        description: knownBenchmark.description,
        reason: knownBenchmark.reason,
        score: knownBenchmark.score,
        artifactChecks: knownBenchmark.artifactChecks,
        advantages: ["Reference benchmark demonstrating AI-ready artifacts"],
        crawledSuccessfully: true,
        isBenchmark: true,
        artifactsFoundCount: knownBenchmark.artifactsFoundCount,
        artifactsFoundPercentage: knownBenchmark.artifactsFoundPercentage,
      })
    }

    const artifactChecks = {
      jsonLdSchema: {
        status: jsonLdData.types.length > 0 ? ("found" as CheckStatus) : ("not_found" as CheckStatus),
        types: jsonLdData.types,
        schemas: jsonLdData.schemas,
      },
      robotsTxt: {
        status: robotsResult.status,
        content: robotsResult.content,
        hasAiDirectives: robotsResult.hasAiDirectives,
        blockedBots: robotsResult.blockedBots,
        allowedBots: robotsResult.allowedBots,
        error: robotsResult.error,
      },
      sitemap: {
        status: sitemapResult.status,
        url: sitemapResult.url,
        urlCount: sitemapResult.urlCount,
        error: sitemapResult.error,
      },
      rssFeed: {
        status: rssResult.status,
        url: rssResult.feedUrl,
        itemCount: rssResult.itemCount,
        error: rssResult.error,
      },
      llmsTxt: {
        status: llmsResult.status,
        content: llmsResult.content,
        hasInstructions: llmsResult.hasInstructions,
        error: llmsResult.error,
      },
      aiManifest: {
        status: aiManifestResult.status,
        content: aiManifestResult.content,
        version: aiManifestResult.version,
        error: aiManifestResult.error,
      },
      mcpConfig: {
        status: mcpResult.status,
        content: mcpResult.content,
        tools: mcpResult.tools,
        error: mcpResult.error,
      },
      openApi: {
        status: openApiResult.status,
        content: openApiResult.content,
        version: openApiResult.version,
        error: openApiResult.error,
      },
    }

    const score = calculateScore(artifactChecks as unknown as Record<string, unknown>, aiAnalysis)

    const industry = aiAnalysis.topicRecognition.industry as keyof typeof INDUSTRY_BENCHMARKS
    const benchmarks = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS.general

    const findings: Array<{
      id: string
      title: string
      category: string
      severity: "critical" | "warning" | "suggestion"
      description: string
      recommendation: string
      competitorNote?: string
      checkStatus: CheckStatus
    }> = []

    if (artifactChecks.jsonLdSchema.status !== "found") {
      const competitorsWithSchema = finalCompetitorResults.filter(
        (c) => c.artifactChecks.jsonLdSchema.status === "found",
      )
      findings.push({
        id: "no-schema",
        title: "Missing JSON-LD Structured Data",
        category: "schema",
        severity: "critical",
        description: "Your website lacks structured data markup that helps AI systems understand your content.",
        recommendation:
          "Add JSON-LD schemas for Organization, Product, FAQ, or Article depending on your content type.",
        competitorNote:
          competitorsWithSchema.length > 0
            ? `${competitorsWithSchema.length} of your competitors have structured data`
            : undefined,
        checkStatus: artifactChecks.jsonLdSchema.status,
      })
    }

    if (artifactChecks.robotsTxt.status !== "found") {
      findings.push({
        id: "no-robots",
        title: "Missing robots.txt",
        category: "technical",
        severity: "warning",
        description: "No robots.txt file found. This file helps control how AI crawlers access your site.",
        recommendation: "Create a robots.txt file with appropriate directives for AI crawlers.",
        checkStatus: artifactChecks.robotsTxt.status,
      })
    } else if (!artifactChecks.robotsTxt.hasAiDirectives) {
      findings.push({
        id: "no-ai-directives",
        title: "No AI Crawler Directives",
        category: "technical",
        severity: "suggestion",
        description: "Your robots.txt doesn't specify rules for AI crawlers like GPTBot or Claude-Web.",
        recommendation: "Add specific User-agent rules for AI crawlers to control how they index your content.",
        checkStatus: "found",
      })
    }

    if (artifactChecks.sitemap.status !== "found") {
      findings.push({
        id: "no-sitemap",
        title: "Missing XML Sitemap",
        category: "technical",
        severity: "warning",
        description: "No sitemap.xml found. Sitemaps help AI systems discover all your content.",
        recommendation: "Generate and submit an XML sitemap to improve content discovery.",
        checkStatus: artifactChecks.sitemap.status,
      })
    }

    if (artifactChecks.llmsTxt.status !== "found") {
      const competitorsWithLlms = finalCompetitorResults.filter((c) => c.artifactChecks.llmsTxt.status === "found")
      findings.push({
        id: "no-llms-txt",
        title: "Missing llms.txt",
        category: "ai",
        severity: "critical",
        description: "llms.txt is the emerging standard for providing instructions to AI language models.",
        recommendation: "Create an llms.txt file to guide how AI systems represent your brand and content.",
        competitorNote:
          competitorsWithLlms.length > 0
            ? `${competitorsWithLlms.length} competitors already have llms.txt`
            : undefined,
        checkStatus: artifactChecks.llmsTxt.status,
      })
    }

    if (artifactChecks.rssFeed.status !== "found") {
      findings.push({
        id: "no-rss",
        title: "Missing RSS Feed",
        category: "content",
        severity: "suggestion",
        description: "No RSS feed detected. RSS helps AI systems track your latest content updates.",
        recommendation: "Add an RSS feed to syndicate your content to AI aggregators.",
        checkStatus: artifactChecks.rssFeed.status,
      })
    }

    if (aiAnalysis.contentGap.missingTopics.length > 0) {
      findings.push({
        id: "content-gaps",
        title: "Content Gaps Identified",
        category: "content",
        severity: "warning",
        description: `Missing coverage of: ${aiAnalysis.contentGap.missingTopics.slice(0, 3).join(", ")}`,
        recommendation: aiAnalysis.contentGap.recommendations[0] || "Expand content to cover missing topics.",
        checkStatus: "not_found",
      })
    }

    if (aiAnalysis.topicRecognition.industry === "local_business" && !aiAnalysis.napData.isComplete) {
      const missing = []
      if (!aiAnalysis.napData.name) missing.push("business name")
      if (!aiAnalysis.napData.address) missing.push("address")
      if (!aiAnalysis.napData.phone) missing.push("phone")
      findings.push({
        id: "incomplete-nap",
        title: "Incomplete Business Information (NAP)",
        category: "local",
        severity: "critical",
        description: `Missing: ${missing.join(", ")}. Complete NAP data is essential for local AI visibility.`,
        recommendation:
          "Ensure your business name, address, and phone are clearly displayed and marked up with schema.",
        checkStatus: "not_found",
      })
    }

    const opportunities: Array<{
      id: string
      title: string
      description: string
      impact: "high" | "medium" | "low"
      estimatedScoreGain: number
    }> = []

    if (artifactChecks.jsonLdSchema.status !== "found") {
      opportunities.push({
        id: "add-schema",
        title: "Add Structured Data",
        description: "Implement JSON-LD schemas to boost AI understanding by up to 40%",
        impact: "high",
        estimatedScoreGain: 20,
      })
    }

    if (artifactChecks.llmsTxt.status !== "found") {
      opportunities.push({
        id: "add-llms-txt",
        title: "Create llms.txt",
        description: "Guide AI systems on how to represent your brand accurately",
        impact: "high",
        estimatedScoreGain: 15,
      })
    }

    if (artifactChecks.openApi.status !== "found") {
      opportunities.push({
        id: "add-openapi",
        title: "Add OpenAPI Specification",
        description: "Enable AI agents to interact with your services programmatically",
        impact: "medium",
        estimatedScoreGain: 10,
      })
    }

    return NextResponse.json({
      success: true,
      url,
      crawledAt: new Date().toISOString(),
      score,
      benchmarks: {
        industry: aiAnalysis.topicRecognition.industry,
        average: benchmarks.average,
        top25: benchmarks.top25,
        top10: benchmarks.top10,
        percentile:
          score >= benchmarks.top10
            ? "top10"
            : score >= benchmarks.top25
              ? "top25"
              : score >= benchmarks.average
                ? "average"
                : "below_average",
      },
      issues: {
        critical: findings.filter((f) => f.severity === "critical").length,
        warnings: findings.filter((f) => f.severity === "warning").length,
        suggestions: findings.filter((f) => f.severity === "suggestion").length,
      },
      findings,
      opportunities,
      artifactChecks,
      analysis: {
        topicRecognition: aiAnalysis.topicRecognition,
        contentGap: aiAnalysis.contentGap,
        napData: aiAnalysis.napData,
        factCheck: aiAnalysis.factCheck,
        userQuestions: aiAnalysis.userQuestions,
      },
      contentInfo: {
        title: (crawlResult.metadata.title as string) || metaTags["og:title"] || "",
        description: metaTags.description || metaTags["og:description"] || "",
        headings,
        metaTagCount: Object.keys(metaTags).length,
      },
      competitors: finalCompetitorResults,
    })
  } catch (error) {
    console.error("Initial scan error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An error occurred during the scan",
      },
      { status: 500 },
    )
  }
}
