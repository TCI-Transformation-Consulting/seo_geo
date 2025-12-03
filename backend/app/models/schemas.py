from typing import Dict, List, Literal, Optional, Any
from pydantic import BaseModel, HttpUrl, Field


class ScanRequest(BaseModel):
    url: str = Field(..., description="The URL to scan (scheme will be added if missing)")


class SEOChecks(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    h1_count: int = 0
    meta_tag_count: int = 0
    canonical_url: Optional[str] = None
    noindex: bool = False
    noarchive: bool = False
    json_ld_types: List[str] = []


class GEOArtifacts(BaseModel):
    robots_txt: bool = False
    ai_directives: List[str] = []
    sitemap_xml: bool = False
    sitemap_urls: int = 0
    rss_feed: bool = False
    llms_txt: bool = False
    ai_manifest: bool = False
    mcp_config: bool = False
    openapi: bool = False
    agent_readiness: bool = False


class ContentIntelligence(BaseModel):
    primary_topic: Optional[str] = None
    secondary_topics: List[str] = []
    industry: Optional[str] = None
    target_audience: Optional[str] = None
    missing_topics: List[str] = []
    missing_questions: List[str] = []
    content_score: int = 0


class Finding(BaseModel):
    id: str
    category: str
    title: str
    severity: Literal["critical", "warning", "suggestion"]
    description: str


class Opportunity(BaseModel):
    id: str
    title: str
    impact: Literal["high", "medium", "low"]
    description: str
    estimated_score_gain: int
    actionability: Literal["manual", "auto"] = "manual"


class SchemaAuditDetail(BaseModel):
    type: str
    completeness: int
    missing_required: List[str] = []
    missing_recommended: List[str] = []
    valid: bool


class ClientProject(BaseModel):
    id: str
    name: str
    domain: str
    score: int
    lastScan: str
    pagesScanned: int
    clusters: int
    issues: int
    status: Literal["healthy", "warning", "critical"]
    trend: List[int]
    auditScores: Dict[str, float]
    htmlSnippet: Optional[str] = None
    # Enhanced fields
    ai_readiness_score: int = 0
    seo: Optional[SEOChecks] = None
    geo: Optional[GEOArtifacts] = None
    content: Optional[ContentIntelligence] = None
    schema_audit: List[SchemaAuditDetail] = []
    findings: List[Finding] = []
    opportunities: List[Opportunity] = []
    competitor_comparison: Optional[str] = None


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    version: str = "1.0.0"


class ContentChunk(BaseModel):
    question: str
    answer: str


class ContentChunksRequest(BaseModel):
    url: HttpUrl = Field(..., description="The full URL to process as Markdown")
    max_chunks: int = 20


class ContentChunksResponse(BaseModel):
    url: HttpUrl
    chunks: List[ContentChunk]


class QuestionItem(BaseModel):
    question: str
    cluster: Optional[str] = None


class QuestionsRequest(BaseModel):
    urls: Optional[List[HttpUrl]] = None
    url: Optional[HttpUrl] = None
    max_items: int = 50


class QuestionsResponse(BaseModel):
    items: List[QuestionItem]


class ReviewRequest(BaseModel):
    review_text: str


class ReviewResponse(BaseModel):
    reply: str


class GapReference(BaseModel):
    competitor: str
    page: Optional[str] = None


class GapItem(BaseModel):
    topic: str
    missing: bool = True
    suggested_h2: Optional[str] = None
    suggested_paragraph: Optional[str] = None
    references: List[GapReference] = []


class SemanticCoverageRequest(BaseModel):
    my_url: HttpUrl
    competitors: List[HttpUrl]
    top_n: int = 10


class SemanticCoverageResponse(BaseModel):
    gaps: List[GapItem]


class NAPData(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    socials: List[str] = []


class NAPAuditRequest(BaseModel):
    url: HttpUrl


class NAPAuditResponse(BaseModel):
    nap: NAPData


class Evidence(BaseModel):
    citation: Optional[str] = None
    snippet: Optional[str] = None


class FactCheckRequest(BaseModel):
    claim: str
    context_urls: List[HttpUrl]


class FactCheckResponse(BaseModel):
    verdict: Literal["true", "false", "uncertain"]
    evidence: List[Evidence] = []


class HallucinationFinding(BaseModel):
    statement: str
    contradiction: Optional[str] = None
    citation: Optional[str] = None
    confidence: Optional[float] = None


class HallucinationDetectRequest(BaseModel):
    generated_text: str
    brand_url: HttpUrl


class HallucinationDetectResponse(BaseModel):
    findings: List[HallucinationFinding]


class AgentToolCall(BaseModel):
    tool: Literal["firecrawl_scrape", "crawl4ai_scrape"]
    args: Dict[str, str]
    output_summary: Optional[str] = None


class AgentConstraints(BaseModel):
    allowlist: Optional[List[str]] = None
    max_calls: int = 3


class AgentRunRequest(BaseModel):
    goal: str
    urls: Optional[List[HttpUrl]] = None
    constraints: Optional[AgentConstraints] = None


class AgentRunResponse(BaseModel):
    steps: List[AgentToolCall]
    summary: str


class JSONLDGenerateRequest(BaseModel):
    url: HttpUrl
    schema_type: Literal["Organization", "Product", "FAQ", "HowTo", "Article"]


class JSONLDGenerateResponse(BaseModel):
    jsonld: str


class OpenAPIGenerateRequest(BaseModel):
    url: HttpUrl


class OpenAPIGenerateResponse(BaseModel):
    openapi: str


class RSSGenerateRequest(BaseModel):
    url: HttpUrl


class RSSGenerateResponse(BaseModel):
    rss: str


class RobotsGenerateRequest(BaseModel):
    url: HttpUrl


class RobotsGenerateResponse(BaseModel):
    robots: str


class SitemapGenerateRequest(BaseModel):
    url: HttpUrl


class SitemapGenerateResponse(BaseModel):
    sitemap: str


class MCPConfigGenerateRequest(BaseModel):
    url: HttpUrl


class MCPConfigGenerateResponse(BaseModel):
    config: str


class AIManifestGenerateRequest(BaseModel):
    url: HttpUrl


class AIManifestGenerateResponse(BaseModel):
    manifest: str


class LlmsTxtGenerateRequest(BaseModel):
    url: HttpUrl


class LlmsTxtGenerateResponse(BaseModel):
    llms_txt: str


class CompetitorSearchRequest(BaseModel):
    domain: HttpUrl = Field(..., description="The domain to find competitors for")
    query: str = Field(..., description="Search context/topic for finding competitors")
    max_results: int = Field(10, description="Maximum number of competitors to return")


class CompetitorResult(BaseModel):
    name: str
    url: str
    description: str
    relevance: str


class Citation(BaseModel):
    title: str
    url: str


class CompetitorSearchResponse(BaseModel):
    competitors: List[CompetitorResult]
    search_queries: List[str]
    citations: List[Citation]


class GroundedAnalysisRequest(BaseModel):
    domain: HttpUrl = Field(..., description="The domain to analyze")
    topic: str = Field(..., description="Industry/topic for the analysis")


class GroundedAnalysisResponse(BaseModel):
    summary: str = Field(..., description="Analysis summary with inline citations")
    search_queries: List[str]
    sources: List[Citation]


class URLListRequest(BaseModel):
    url: HttpUrl = Field(..., description="Root domain or homepage to enumerate URLs for")
    max_urls: int = Field(1000, description="Maximum URLs to return (sitemap + nested indexes respected)")


class URLListResponse(BaseModel):
    root: HttpUrl
    count: int
    urls: List[str]
    source: Literal["sitemap", "crawl", "mixed"]


# AI Visibility Analysis
class AIVisibilityRequest(BaseModel):
    url: HttpUrl = Field(..., description="The website URL to analyze")
    brand_name: str = Field(..., description="The brand/company name")
    keywords: List[str] = Field(..., description="Keywords to test visibility for")
    competitors: List[str] = Field(default=[], description="Optional list of competitor domains")


class PlatformVisibility(BaseModel):
    score: int = Field(..., description="0=not mentioned, 1=peripherally mentioned, 2=primarily recommended")
    reasoning: str = Field(..., description="Explanation for the visibility score")
    would_mention: bool = Field(default=False)
    mention_context: str = Field(default="")


class KeywordVisibility(BaseModel):
    keyword: str
    visibility_score: int
    reasoning: str
    improvement_suggestions: List[str] = []


class CompetitorComparison(BaseModel):
    our_position: str = Field(default="unknown")
    reasoning: str = Field(default="")
    competitors_ahead: List[str] = []
    competitors_behind: List[str] = []


class ImprovementRecommendation(BaseModel):
    priority: str
    action: str
    expected_impact: str
    reasoning: str


class AIVisibilityResponse(BaseModel):
    domain: str
    brand_name: str
    keywords: List[str]
    overall_score: int = Field(..., description="Overall visibility score 0-100")
    overall_reasoning: str = Field(..., description="Summary of visibility analysis with reasoning")
    platforms: Dict[str, Any] = Field(default={}, description="Per-platform visibility scores with reasoning")
    keyword_analysis: List[Dict[str, Any]] = []
    competitor_comparison: Dict[str, Any] = {}
    improvement_recommendations: List[Dict[str, Any]] = []
    error: Optional[str] = None
