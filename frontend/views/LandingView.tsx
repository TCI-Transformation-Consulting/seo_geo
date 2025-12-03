"use client"

import type React from "react"
import { useState } from "react"
import type { ViewState, ClientProject, PackagePresetId } from "../types"
import { PACKAGE_PRESETS, ANALYSIS_TYPES, GENERATION_TYPES } from "../constants"
import { initialScan, getContentChunks, scanBatch, postCompetitorSearch, runComprehensiveAnalysis, runAIVisibilityAnalysis } from "../services/api"
import {
  Search,
  Loader2,
  AlertCircle,
  Globe,
  Package,
  Sparkles,
  CheckCircle2,
  Zap,
  Briefcase,
  Bot,
  FileCode,
  Shield,
  Rss,
  Settings,
  FileJson,
} from "lucide-react"

interface LandingViewProps {
  onNavigate: (view: ViewState) => void
  onScanComplete: (project: ClientProject) => void
}

const PackageIcon = ({ id }: { id: string }) => {
  switch (id) {
    case "quick_check":
      return <Zap className="w-5 h-5" />
    case "seo_essential":
      return <Search className="w-5 h-5" />
    case "business_complete":
      return <Briefcase className="w-5 h-5" />
    case "ai_ready":
      return <Bot className="w-5 h-5" />
    default:
      return <Package className="w-5 h-5" />
  }
}

const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case "structured_data":
      return <FileJson className="w-4 h-4" />
    case "technical":
      return <Settings className="w-4 h-4" />
    case "feeds":
      return <Rss className="w-4 h-4" />
    case "security":
      return <Shield className="w-4 h-4" />
    case "ai_integration":
      return <Bot className="w-4 h-4" />
    default:
      return <FileCode className="w-4 h-4" />
  }
}

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate, onScanComplete }) => {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<PackagePresetId>("business_complete")
  const [expandedPackage, setExpandedPackage] = useState<PackagePresetId | null>(null)
  const [depthMode, setDepthMode] = useState<"quick" | "standard" | "full">("standard")
  const [scanStatus, setScanStatus] = useState<string>("")
  const [scanProgress, setScanProgress] = useState<number>(0)

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return

    // Normalize URL: add https:// if missing and validate early
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
    try {
      new URL(normalizedUrl)
    } catch {
      setError("Please enter a valid URL (e.g., https://example.com)")
      return
    }

    setIsLoading(true)
    setError(null)
    setScanProgress(0)

    // Progress tracking - only moves forward
    let currentProgress = 0
    const updateProgress = (newProgress: number, status?: string) => {
      if (newProgress > currentProgress) {
        currentProgress = newProgress
        setScanProgress(newProgress)
      }
      if (status) {
        setScanStatus(status)
      }
    }

    // Progress messages that will cycle while waiting for the actual API
    const progressMessages = [
      { msg: "Initializing crawler...", pct: 5 },
      { msg: "Fetching homepage...", pct: 8 },
      { msg: "Checking robots.txt and AI policies...", pct: 12 },
      { msg: "Scanning for sitemap.xml...", pct: 16 },
      { msg: "Looking for RSS/Atom feeds...", pct: 20 },
      { msg: "Analyzing JSON-LD schemas...", pct: 24 },
      { msg: "Checking llms.txt and AI manifests...", pct: 28 },
      { msg: "Running initial content analysis...", pct: 32 },
      { msg: "Processing page structure...", pct: 36 },
      { msg: "Extracting metadata...", pct: 40 },
      { msg: "Building content profile...", pct: 44 },
      { msg: "Analyzing business information...", pct: 48 },
      { msg: "Identifying key topics...", pct: 52 },
      { msg: "Mapping content relationships...", pct: 56 },
      { msg: "Running deep analysis...", pct: 60 },
    ]

    let messageIndex = 0
    
    // Slower progress: update every 5 seconds
    const progressInterval = setInterval(() => {
      if (messageIndex < progressMessages.length) {
        const step = progressMessages[messageIndex]
        updateProgress(step.pct, step.msg)
        messageIndex++
      } else {
        // Keep showing waiting messages but don't change progress
        const waitingMessages = [
          "Still processing... this may take a moment",
          "Analyzing website structure...",
          "Running deep content analysis...",
          "Almost there...",
        ]
        const waitIdx = (messageIndex - progressMessages.length) % waitingMessages.length
        setScanStatus(waitingMessages[waitIdx])
        messageIndex++
      }
    }, 5000)

    try {
      const scanResult = await initialScan(normalizedUrl)
      updateProgress(65, "Initial scan complete, running comprehensive LLM analysis...")

      // Run comprehensive LLM-based analysis (Scrape → LLM Parse → Structured Data)
      let analysisError: string | undefined
      let aiAnalysis: any | undefined
      let comprehensiveData: any | undefined
      
      try {
        setScanStatus("Running comprehensive AI analysis...")
        comprehensiveData = await runComprehensiveAnalysis(normalizedUrl)
        setScanProgress(88)
        
        // Also get content chunks for questions (non-blocking)
        let filteredQuestions: string[] = []
        try {
          setScanStatus("Extracting content insights...")
          const chunksRes = await getContentChunks(normalizedUrl, 10)
          
          const rawQuestions = (chunksRes?.chunks || [])
            .map((c: any) => String(c?.question || ""))
            .filter(Boolean)
          // Simple noise filter for unrelated/political/news questions
          const noise = [/bundestag/i, /regierung/i, /koalition/i, /wahl/i, /ampel/i, /covid|corona/i]
          filteredQuestions = Array.from(
            new Set(
              rawQuestions
                .map((q) => q.replace(/^#+\s*/, "").trim())
                .filter((q) => q.length > 8 && !noise.some((rx) => rx.test(q)))
            )
          ).slice(0, 8)
        } catch (chunkError) {
          console.warn("Content chunks extraction failed, using comprehensive data:", chunkError)
        }
        setScanProgress(92)

        // Use comprehensive analysis results
        const business = comprehensiveData?.business || {}
        const content = comprehensiveData?.content || {}
        const entities = comprehensiveData?.entities || {}
        const seo = comprehensiveData?.seo || {}
        const credibility = comprehensiveData?.credibility || {}
        const contentQuality = comprehensiveData?.contentQuality || {}
        const schema = comprehensiveData?.schema || {}

        aiAnalysis = {
          topicRecognition: {
            primaryTopic: content?.primaryTopic || "",
            secondaryTopics: content?.secondaryTopics || [],
            industry: content?.industry || "general",
            contentType: content?.contentType || "web",
            keywords: entities?.keywords || [],
            entities: (entities?.people || []).map((p: any) => ({ name: p.name, type: p.role || "Person" })),
            targetAudience: content?.targetAudience || "",
            confidence: credibility?.score ?? 60,
          },
          contentGap: {
            missingTopics: contentQuality?.missingElements || [],
            missingQuestions: [],
            contentScore: contentQuality?.score ?? 50,
            recommendations: [
              ...(schema?.reasoning ? [schema.reasoning] : []),
              ...(!contentQuality?.hasFAQ ? ["Add FAQ section for better AI discoverability"] : []),
              ...(!contentQuality?.hasPricing ? ["Consider adding pricing information"] : []),
            ],
          },
          napData: {
            name: business?.name ?? null,
            legalForm: business?.legalForm ?? null,
            address: business?.address ?? null,
            phone: business?.phone ?? null,
            email: business?.email ?? null,
            isComplete: !!(business?.name && business?.address && (business?.phone || business?.email)),
            scannedPages: comprehensiveData?._meta?.scannedPages || [],
            completeness: `${[business?.name, business?.address, business?.phone, business?.email].filter(Boolean).length}/4`,
            foundOnPage: business?.foundOnPage ?? null,
            validation: business?._validation ?? null,
          },
          seoData: {
            title: seo?.title ?? null,
            description: seo?.description ?? null,
            h1: seo?.h1 || [],
            h1Assessment: seo?.h1Assessment ?? null,
            keyMessages: seo?.keyMessages || [],
          },
          credibility: {
            hasImpressum: credibility?.hasImpressum ?? false,
            hasContact: credibility?.hasContact ?? false,
            hasSocialProof: credibility?.hasSocialProof ?? false,
            trustSignals: credibility?.trustSignals || [],
            score: credibility?.score ?? 50,
          },
          schemaRecommendations: {
            detected: schema?.detected || [],
            recommended: schema?.recommended || [],
            reasoning: schema?.reasoning ?? null,
          },
          factCheck: {
            claims: [],
            overallCredibility: credibility?.score ?? 50,
            recommendations: credibility?.trustSignals || [],
          },
          userQuestions: filteredQuestions.length > 0 ? filteredQuestions : (seo?.keyMessages || []),
        }
        setScanProgress(94)
      } catch (e: any) {
        analysisError = e?.message || "Comprehensive analysis failed"
        console.warn("Comprehensive analysis error:", e)
      }

      // Run AI Visibility Analysis (non-blocking)
      let aiVisibility: any | undefined
      try {
        setScanStatus("Running AI Visibility analysis...")
        const visibilityResult = await runAIVisibilityAnalysis(normalizedUrl, "")
        aiVisibility = visibilityResult
        
        // Update user questions with the better ones from visibility analysis
        if (aiAnalysis && visibilityResult?.user_questions?.length > 0) {
          aiAnalysis.userQuestions = visibilityResult.user_questions
        }
        
        // Add visibility data to aiAnalysis
        if (aiAnalysis) {
          aiAnalysis.aiVisibility = {
            totalScore: visibilityResult?.visibility_score?.total_score ?? 0,
            grade: visibilityResult?.visibility_score?.grade ?? "F",
            summary: visibilityResult?.visibility_score?.summary ?? "",
            ungroundedScore: visibilityResult?.ungrounded?.score ?? 0,
            groundedPercentage: visibilityResult?.grounded?.percentage ?? 0,
            priorityActions: visibilityResult?.visibility_score?.priority_actions || [],
            contentGaps: visibilityResult?.grounded?.content_gaps || [],
            groundedResults: visibilityResult?.grounded?.results || [],
          }
        }
        setScanProgress(96)
      } catch (e: any) {
        console.warn("AI Visibility analysis failed (non-blocking):", e)
      }

      // Optional batch run based on selected scope
      let batchSummary: any | undefined
      try {
        const maxPages =
          depthMode === "quick" ? 10 : depthMode === "standard" ? 40 : 1000 // Full: large cap; backend trims to sitemap size
        setScanStatus(`Running batch analysis (${maxPages} pages)...`)
        setScanProgress(95)
        const batch = await scanBatch(normalizedUrl, maxPages)
        batchSummary = {
          processed: batch.processed,
          chunks_ok: batch.chunks_ok,
          nap_ok: batch.nap_ok,
          errors_count: batch.errors_count,
          sample: batch.sample || [],
        }
        setScanProgress(97)
      } catch (e: any) {
        // Do not block initial result if batch fails
        console.warn("Batch scan failed:", e?.message || e)
      }

      const preset = PACKAGE_PRESETS[selectedPackage]
      if (!preset) {
        throw new Error(`Invalid package selected: ${selectedPackage}`)
      }

      // Derive richer fields from backend response when available
      const hostname = new URL(scanResult.url).hostname
      const benchmarks = (scanResult as any).benchmarks || { average: 45, top25: 65, top10: 85 }
      const percentile =
        scanResult.score >= (benchmarks.top10 || 0)
          ? "top10"
          : scanResult.score >= (benchmarks.top25 || 0)
            ? "top25"
            : scanResult.score >= (benchmarks.average || 0)
              ? "aboveAverage"
              : "belowAverage"
      const ts: any = (scanResult as any).technicalStatus || {}
      
      const contentInfo =
        (scanResult as any).contentInfo || {
          title: scanResult.contentAnalysis?.title || "",
          description: scanResult.contentAnalysis?.description || "",
          headings: { h1: [], h2: [], h3: [] },
          metaTagCount: scanResult.technicalStatus?.metaTagCount || 0,
        }

      // Competitor discovery (Grounded with SERP fallback on backend)
      setScanStatus("Searching for competitors...")
      setScanProgress(98)
      let competitorsMapped: any[] = []
      try {
        const compRes = await postCompetitorSearch(hostname, hostname, 5)
        const items = (compRes as any)?.competitors || []
        competitorsMapped = items.map((it: any) => ({
          name: it?.name || it?.url || "Competitor",
          url: it?.url || "",
          description: it?.description || "",
          reason: "SERP/Grounded result",
          competitorType: "direct",
          score: 0,
          artifactChecks: {
            jsonLdSchema: { status: "not_found", types: [] },
            robotsTxt: { status: "not_found", hasAiDirectives: false },
            sitemap: { status: "not_found", urlCount: 0 },
            rssFeed: { status: "not_found" },
            llmsTxt: { status: "not_found" },
            aiManifest: { status: "not_found" },
            mcpConfig: { status: "not_found" },
            openApi: { status: "not_found" },
          },
          advantages: [],
          crawledSuccessfully: false,
        }))
      } catch (e: any) {
        console.warn("Competitor search failed:", e?.message || e)
      }

      const project: ClientProject = {
        id: `project-${Date.now()}`,
        name: scanResult.contentAnalysis?.title || hostname,
        domain: hostname,
        url: scanResult.url,
        score: scanResult.score,
        lastScan: scanResult.crawledAt,
        pagesScanned: 1,
        clusters: 0,
        issues: (scanResult.issues?.critical || 0) + (scanResult.issues?.warnings || 0),
        status: scanResult.score < 40 ? "critical" : scanResult.score < 70 ? "warning" : "healthy",
        trend: [],
        auditScores: {},
        selectedPackage,
        initialScan: {
          score: scanResult.score,
          industry: ((scanResult as any).benchmarks?.industry as string) || "general",
          benchmark: {
            average: benchmarks.average,
            top25: benchmarks.top25,
            top10: benchmarks.top10,
          },
          scoreContext: {
            yourScore: scanResult.score,
            industryAverage: benchmarks.average,
            top25Percent: benchmarks.top25,
            top10Percent: benchmarks.top10,
            percentile: percentile as any,
          },
          issues: scanResult.issues || { critical: 0, warnings: 0, suggestions: 0 },
          findings: scanResult.findings || [],
          opportunities: (scanResult.opportunities || []).map((o, i) => ({
            id: o.id || `opp-${i}`,
            title: o.title || "Opportunity",
            impact: (o.impact as any) || "low",
            description: o.description || "",
            estimatedScoreGain: 2,
          })),
          technicalStatus: ts,
          contentAnalysis: scanResult.contentAnalysis || { title: "", description: "", hasFaqContent: false, headingStructure: { h1: 0, h2: 0, h3: 0 } },
          analysis: (aiAnalysis || (scanResult as any).analysis),
          analysisError: analysisError,
          batchSummary,
          competitors: competitorsMapped,
          competitorComparison:
            competitorsMapped.length > 0
              ? `Initial competitors discovered: ${competitorsMapped.length}`
              : (scanResult as any).competitorComparison || "",
          crawledAt: scanResult.crawledAt,
        },
        analyses: (preset.analyses || []).map((id) => ({
          id,
          name: ANALYSIS_TYPES[id]?.name || id,
          status: "pending" as const,
        })),
        generatedFiles: (preset.generations || []).map((id) => {
          const gen = GENERATION_TYPES[id]
          return {
            id,
            name: gen?.name || id,
            filename: gen?.filename || `${id}.txt`,
            content: "",
            status: "pending" as const,
          }
        }),
      }

      // Final progress update
      clearInterval(progressInterval)
      setScanProgress(100)
      setScanStatus("Analysis complete!")

      setTimeout(() => onScanComplete(project), 500)
    } catch (err: any) {
      clearInterval(progressInterval)
      console.error("Scan error:", err)
      setError(err.message || "Could not reach the analysis engine. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const packages = Object.entries(PACKAGE_PRESETS).map(([key, preset]) => ({
    id: preset.id as PackagePresetId,
    key,
    ...preset,
  }))

  const getAnalysisDetails = (analysisIds: string[] | undefined) => {
    if (!analysisIds) return []
    return analysisIds.map((id) => {
      const analysis = ANALYSIS_TYPES[id]
      return analysis || { id, name: id, description: "", category: "analysis" }
    })
  }

  const getGenerationDetails = (generationIds: string[] | undefined) => {
    if (!generationIds) return []
    return generationIds.map((id) => {
      const gen = GENERATION_TYPES[id]
      return gen || { id, name: id, filename: `${id}.txt`, description: "", category: "technical" }
    })
  }

  const groupByCategory = (items: any[]) => {
    const grouped: Record<string, any[]> = {}
    items.forEach((item) => {
      const cat = item.category || "other"
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(item)
    })
    return grouped
  }

  return (
    <div className="min-h-screen text-slate-50 font-sans animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-[128px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-[128px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            AI Readiness <span className="text-indigo-400">Scanner</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Analyze your website's compatibility with AI systems. Get a detailed report with competitor analysis,
            artifact checks, and actionable recommendations.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Step 1: URL Input */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full glass-button flex items-center justify-center font-bold text-sm">1</div>
            <h2 className="text-xl font-bold">Enter your website URL</h2>
          </div>
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              className="w-full glass-input rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        {/* Step 2: Package Selection */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full glass-button flex items-center justify-center font-bold text-sm">2</div>
            <h2 className="text-xl font-bold">Select analysis package</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id as PackagePresetId)}
                disabled={isLoading}
                className={`p-4 rounded-xl text-left transition-all relative ${
                  selectedPackage === pkg.id
                    ? "glass-list-item-active"
                    : "glass-card hover:border-indigo-500/30"
                } disabled:opacity-50`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    selectedPackage === pkg.id ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-slate-400"
                  }`}
                >
                  <PackageIcon id={pkg.id} />
                </div>
                <h3 className="font-bold text-white text-sm mb-1">{pkg.name}</h3>
                <p className="text-xs text-slate-500 mb-2">{pkg.estimatedTime}</p>
                <div className="flex gap-2 text-xs">
                  <span className="glass-badge px-2 py-0.5 rounded text-slate-300">
                    {pkg.analyses?.length || 0} checks
                  </span>
                  <span className="glass-badge px-2 py-0.5 rounded text-slate-300">
                    {pkg.generations?.length || 0} files
                  </span>
                </div>
                {selectedPackage === pkg.id && (
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 absolute top-3 right-3" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Analysis scope */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full glass-button flex items-center justify-center font-bold text-sm">3</div>
            <h2 className="text-xl font-bold">Choose analysis scope</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setDepthMode("quick")}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                depthMode === "quick"
                  ? "glass-list-item-active text-white"
                  : "glass-card text-slate-300 hover:border-indigo-500/30"
              }`}
              title="~10 Seiten, schneller Überblick"
            >
              Quick (~10 pages)
            </button>
            <button
              type="button"
              onClick={() => setDepthMode("standard")}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                depthMode === "standard"
                  ? "glass-list-item-active text-white"
                  : "glass-card text-slate-300 hover:border-indigo-500/30"
              }`}
              title="~40 Seiten, empfohlener Standard"
            >
              Standard (~40 pages) - default
            </button>
            <button
              type="button"
              onClick={() => setDepthMode("full")}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                depthMode === "full"
                  ? "glass-list-item-active text-white"
                  : "glass-card text-slate-300 hover:border-indigo-500/30"
              }`}
              title="Alle Seiten (kann länger dauern)"
            >
              Full (all pages)
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Standard run analyzes ~40 pages. Switch to "Full" to check the entire site.
          </p>
        </div>

        {/* Step 4: Run Analysis */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full glass-button flex items-center justify-center font-bold text-sm">4</div>
            <h2 className="text-xl font-bold">Run analysis</h2>
          </div>

          {error && (
            <div className="mb-4 glass-badge-error p-4 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {isLoading && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">{scanStatus}</span>
                <span className="text-sm text-indigo-400 font-medium">{scanProgress}%</span>
              </div>
              <div className="glass-progress h-2">
                <div
                  className="glass-progress-bar h-2"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-400">
              <strong className="text-white">{PACKAGE_PRESETS[selectedPackage]?.name}</strong>: Website analysis
              with competitor comparison, artifact detection, and recommendations.
              <span className="ml-2 text-slate-500">Scope: {depthMode === "quick" ? "Quick (~10 pages)" : depthMode === "standard" ? "Standard (~40 pages)" : "Full (all pages)"}</span>
            </div>
            <button
              onClick={handleStart}
              disabled={isLoading || !url}
              className="w-full sm:w-auto glass-button disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-8 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Start Analysis
                </>
              )}
            </button>
          </div>
        </div>

        {/* What You Get */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="glass-card p-5">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="font-bold text-white mb-2">Detailed Analysis</h3>
            <p className="text-sm text-slate-400">
              Comprehensive check of all AI-relevant artifacts: schemas, robots.txt, sitemaps, llms.txt, and more.
            </p>
          </div>
          <div className="glass-card p-5">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-3">
              <Bot className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="font-bold text-white mb-2">Competitor Insights</h3>
            <p className="text-sm text-slate-400">
              AI-powered competitor discovery and comparison to see how you stack up in your industry.
            </p>
          </div>
          <div className="glass-card p-5">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center mb-3">
              <FileCode className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="font-bold text-white mb-2">Ready-to-Use Files</h3>
            <p className="text-sm text-slate-400">
              Generate optimized JSON-LD schemas, robots.txt, sitemaps, and AI manifests based on your report.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
