export type ViewState = "landing" | "pricing" | "dashboard" | "project_detail" | "login"

export type PackagePresetId = "quick_check" | "seo_essential" | "business_complete" | "ai_ready"

export enum ScanStatus {
  IDLE = "IDLE",
  SCANNING = "SCANNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum AgentPersona {
  SHOPPER = "SHOPPER",
  ANALYST = "ANALYST",
  SEARCHER = "SEARCHER",
}

export interface AuditDimension {
  id: string
  label: string
  description: string
  icon: string
}

export interface GenerationOption {
  id: string
  label: string
  description: string
  credits: string
  promptTemplate: string
}

export interface GeneratedFile {
  id: string
  name: string
  filename: string
  content: string
  status: "pending" | "generating" | "completed" | "error"
  error?: string
}

export interface AnalysisResult {
  id: string
  name: string
  status: "pending" | "running" | "completed" | "error"
  result?: any
  error?: string
}

export type CheckStatus = "found" | "not_found" | "check_failed"

export interface CompetitorResult {
  name: string
  url: string
  description: string
  reason: string // Why they are a direct competitor
  competitorType?: "direct" | "indirect" | "aspirational"
  score: number
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
  advantages: string[] // What they have that user doesn't
  crawledSuccessfully: boolean
  isBenchmark?: boolean
  artifactsFoundCount?: number
  artifactsFoundPercentage?: number
}

export interface TopicRecognition {
  primaryTopic: string
  secondaryTopics: string[]
  industry: string
  contentType: string
  keywords: string[]
  entities: Array<{ name: string; type: string }>
  targetAudience: string
}

export interface ContentGapAnalysis {
  missingTopics: string[]
  missingQuestions: string[]
  contentScore: number
  recommendations: string[]
}

export interface NAPData {
  name: string | null
  address: string | null
  phone: string | null
  email: string | null
  isComplete: boolean
}

export interface FactCheckResult {
  claims: Array<{ claim: string; verifiable: boolean; issue: string | null }>
  overallCredibility: number
  recommendations: string[]
}

export interface AIVisibility {
  totalScore: number
  grade: string
  summary: string
  ungroundedScore: number
  groundedPercentage: number
  priorityActions: string[]
  contentGaps: string[]
  groundedResults: Array<{
    question: string
    answerable: boolean
    answer_quality: string
    answer_preview: string | null
    missing_info: string | null
    score: number
    max_score: number
  }>
}

export interface AIAnalysis {
  topicRecognition: TopicRecognition
  contentGap: ContentGapAnalysis
  napData: NAPData
  factCheck: FactCheckResult
  userQuestions: string[]
  aiVisibility?: AIVisibility
}

export interface TechnicalStatus {
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
  headings: any
}

export interface ContentAnalysis {
  title: string
  description: string
  hasFaqContent: boolean
  headingStructure: { h1: number; h2: number; h3: number }
}

export interface InitialScanResult {
  success?: boolean
  url?: string
  score: number
  issues: {
    critical: number
    warnings: number
    suggestions: number
  }
  findings: Array<{
    id: string
    category: string
    title: string
    severity: "critical" | "warning" | "suggestion"
    description: string
  }>
  opportunities: Array<{
    id: string
    title: string
    impact: "high" | "medium" | "low"
    description: string
    estimatedScoreGain: number
  }>
  technicalStatus: TechnicalStatus
  contentAnalysis: ContentAnalysis
  competitors: CompetitorResult[]
  competitorComparison?: string
  crawledAt: string
  
  // Optional legacy/extended fields if needed by UI components
  industry?: string
  benchmark?: {
    average: number
    top25: number
    top10: number
  }
  scoreContext?: {
    yourScore: number
    industryAverage: number
    top25Percent: number
    top10Percent: number
    percentile: "top10" | "top25" | "aboveAverage" | "belowAverage"
  }
  batchSummary?: {
    processed: number
    chunks_ok: number
    nap_ok: number
    errors_count: number
    sample: Array<{
      url: string
      chunks_preview?: Array<{ question: string; answer: string }>
      nap?: any
    }>
  }
  analysis?: AIAnalysis
  analysisError?: string
}

export interface ClientProject {
  id: string
  name: string
  domain: string
  url: string
  score: number
  lastScan: string
  pagesScanned: number
  clusters: number
  issues: number
  status: "healthy" | "warning" | "critical"
  trend: number[]
  auditScores: Record<string, number>
  htmlSnippet?: string
  markdown?: string
  selectedPackage: PackagePresetId
  analyses: AnalysisResult[]
  generatedFiles: GeneratedFile[]
  initialScan?: InitialScanResult
}

export interface PageCluster {
  id: string
  name: string
  count: number
  avgScore: number
  keyIssue: string
}

export interface SimulationResult {
  persona: AgentPersona
  perception: string
  missingData: string[]
  score: number
}
