import { Home, LayoutDashboard, CreditCard, BookOpen } from "lucide-react"

// Navigation items for sidebar (login is gated separately, not shown here)
export const NAV_ITEMS = [
  { id: "home", label: "Home", view: "landing" as const, icon: Home },
  { id: "dashboard", label: "Dashboard", view: "dashboard" as const, icon: LayoutDashboard },
  { id: "pricing", label: "Pricing", view: "pricing" as const, icon: CreditCard },
  { id: "docs", label: "Documentation", view: "landing" as const, icon: BookOpen },
]

// Category labels for display
export const CATEGORY_LABELS = {
  structured_data: "Structured Data",
  technical: "Technical",
  feeds: "Feeds & Syndication",
  security: "Security & Access",
  ai_integration: "AI Integration",
  content: "Content Analysis",
  seo: "SEO & Discovery",
  analysis: "Analysis",
  other: "Other",
}

// Analysis types with descriptions
export const ANALYSIS_TYPES: Record<string, { id: string; name: string; description: string; category: string }> = {
  content_extraction: {
    id: "content_extraction",
    name: "Content Extraction",
    description: "Extract and analyze page content structure",
    category: "content",
  },
  topic_recognition: {
    id: "topic_recognition",
    name: "Topic Recognition",
    description: "Identify main topics, keywords, and entities",
    category: "content",
  },
  content_gap: {
    id: "content_gap",
    name: "Content Gap Analysis",
    description: "Find missing content opportunities",
    category: "content",
  },
  nap_verification: {
    id: "nap_verification",
    name: "NAP Verification",
    description: "Verify Name, Address, Phone consistency",
    category: "seo",
  },
  fact_check: {
    id: "fact_check",
    name: "Fact Check",
    description: "Verify factual claims and credibility",
    category: "content",
  },
  schema_audit: {
    id: "schema_audit",
    name: "Schema Audit",
    description: "Audit existing JSON-LD structured data",
    category: "structured_data",
  },
  accessibility_check: {
    id: "accessibility_check",
    name: "Accessibility Check",
    description: "Check AI accessibility (alt text, headings, semantic HTML)",
    category: "technical",
  },
  competitor_search: {
    id: "competitor_search",
    name: "Competitor Analysis",
    description: "Find and analyze competitors with AI",
    category: "analysis",
  },
}

// Generation types with descriptions
export const GENERATION_TYPES: Record<
  string,
  { id: string; name: string; filename: string; description: string; category: string }
> = {
  organization_schema: {
    id: "organization_schema",
    name: "Organization Schema",
    filename: "organization-schema.json",
    description: "JSON-LD Organization structured data",
    category: "structured_data",
  },
  product_schema: {
    id: "product_schema",
    name: "Product Schema",
    filename: "product-schema.json",
    description: "JSON-LD Product structured data",
    category: "structured_data",
  },
  faq_schema: {
    id: "faq_schema",
    name: "FAQ Schema",
    filename: "faq-schema.json",
    description: "JSON-LD FAQPage structured data",
    category: "structured_data",
  },
  article_schema: {
    id: "article_schema",
    name: "Article Schema",
    filename: "article-schema.json",
    description: "JSON-LD Article structured data",
    category: "structured_data",
  },
  localbusiness_schema: {
    id: "localbusiness_schema",
    name: "LocalBusiness Schema",
    filename: "localbusiness-schema.json",
    description: "JSON-LD LocalBusiness structured data",
    category: "structured_data",
  },
  robots_txt: {
    id: "robots_txt",
    name: "robots.txt",
    filename: "robots.txt",
    description: "Optimized robots.txt with AI crawler rules",
    category: "technical",
  },
  sitemap_xml: {
    id: "sitemap_xml",
    name: "Sitemap XML",
    filename: "sitemap.xml",
    description: "XML sitemap for search engines",
    category: "technical",
  },
  rss_feed: {
    id: "rss_feed",
    name: "RSS Feed",
    filename: "feed.xml",
    description: "RSS feed for content syndication",
    category: "feeds",
  },
  openapi_spec: {
    id: "openapi_spec",
    name: "OpenAPI Spec",
    filename: "openapi.json",
    description: "OpenAPI specification for APIs",
    category: "technical",
  },
  mcp_config: {
    id: "mcp_config",
    name: "MCP Config",
    filename: "mcp.json",
    description: "Model Context Protocol configuration",
    category: "ai_integration",
  },
  ai_manifest: {
    id: "ai_manifest",
    name: "AI Manifest",
    filename: "ai-manifest.json",
    description: "AI plugin manifest for assistants",
    category: "ai_integration",
  },
  llms_txt: {
    id: "llms_txt",
    name: "llms.txt",
    filename: "llms.txt",
    description: "LLM instructions file",
    category: "ai_integration",
  },
}

// Package presets
export const PACKAGE_PRESETS: Record<
  string,
  {
    id: string
    name: string
    description: string
    estimatedTime: string
    analyses: string[]
    generations: string[]
  }
> = {
  quick_check: {
    id: "quick_check",
    name: "Quick Check",
    description: "Fast overview of AI readiness status",
    estimatedTime: "1-2 min",
    analyses: ["content_extraction", "schema_audit"],
    generations: ["organization_schema", "robots_txt"],
  },
  seo_essential: {
    id: "seo_essential",
    name: "SEO Essential",
    description: "Core SEO and structured data package",
    estimatedTime: "3-5 min",
    analyses: ["content_extraction", "topic_recognition", "nap_verification", "schema_audit"],
    generations: ["organization_schema", "product_schema", "faq_schema", "robots_txt", "sitemap_xml"],
  },
  business_complete: {
    id: "business_complete",
    name: "Business Complete",
    description: "Full business optimization package",
    estimatedTime: "5-8 min",
    analyses: [
      "content_extraction",
      "topic_recognition",
      "content_gap",
      "nap_verification",
      "fact_check",
      "schema_audit",
      "accessibility_check",
    ],
    generations: [
      "organization_schema",
      "product_schema",
      "faq_schema",
      "article_schema",
      "localbusiness_schema",
      "robots_txt",
      "sitemap_xml",
      "rss_feed",
    ],
  },
  ai_ready: {
    id: "ai_ready",
    name: "AI Ready",
    description: "Complete AI integration package",
    estimatedTime: "8-12 min",
    analyses: [
      "content_extraction",
      "topic_recognition",
      "content_gap",
      "nap_verification",
      "fact_check",
      "schema_audit",
      "accessibility_check",
      "competitor_search",
    ],
    generations: [
      "organization_schema",
      "product_schema",
      "faq_schema",
      "article_schema",
      "localbusiness_schema",
      "robots_txt",
      "sitemap_xml",
      "rss_feed",
      "openapi_spec",
      "mcp_config",
      "ai_manifest",
      "llms_txt",
    ],
  },
}

// Pricing tiers
export const PRICING_TIERS = [
  {
    id: "starter",
    name: "Starter",
    price: "Free",
    description: "Try it out",
    features: ["5 scans/month", "Quick Check package", "Basic support"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: "$49",
    period: "/month",
    description: "For growing businesses",
    features: ["50 scans/month", "All packages", "Priority support", "API access"],
    cta: "Start Trial",
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$199",
    period: "/month",
    description: "For agencies & teams",
    features: ["Unlimited scans", "White-label reports", "Dedicated support", "Custom integrations"],
    cta: "Contact Sales",
    highlighted: false,
  },
]

// Mock projects for demo
export const MOCK_PROJECTS = [
  {
    id: "demo-1",
    name: "Example Store",
    domain: "example-store.com",
    url: "https://example-store.com",
    score: 72,
    lastScan: new Date().toISOString(),
    pagesScanned: 15,
    clusters: 3,
    issues: 5,
    status: "warning" as const,
    trend: [65, 68, 70, 72],
  },
]

// Sample HTML content for testing
export const SAMPLE_HTML_CONTENT = `
<!DOCTYPE html>
<html>
<head>
  <title>Example Website</title>
  <meta name="description" content="An example website for testing">
</head>
<body>
  <h1>Welcome to Example</h1>
  <p>This is sample content for testing the analysis engine.</p>
</body>
</html>
`
