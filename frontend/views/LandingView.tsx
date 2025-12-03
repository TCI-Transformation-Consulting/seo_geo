"use client"

import type React from "react"
import { useState } from "react"
import type { ViewState, ClientProject, PackagePresetId } from "../types"
import { PACKAGE_PRESETS, ANALYSIS_TYPES, GENERATION_TYPES } from "../constants"
import { initialScan, getContentChunks, postNapAudit, scanBatch, postCompetitorSearch, postTopicRecognition, postContentGap } from "../services/api"
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

    // Progress messages that will cycle while waiting for the actual API
    const progressMessages = [
      { msg: "Initializing crawler...", minPct: 5 },
      { msg: "Fetching homepage...", minPct: 10 },
      { msg: "Checking robots.txt and AI policies...", minPct: 15 },
      { msg: "Scanning for sitemap.xml...", minPct: 20 },
      { msg: "Looking for RSS/Atom feeds...", minPct: 25 },
      { msg: "Analyzing JSON-LD schemas...", minPct: 30 },
      { msg: "Checking llms.txt and AI manifests...", minPct: 35 },
      { msg: "Running initial content analysis...", minPct: 40 },
      { msg: "Extracting content chunks...", minPct: 45 },
      { msg: "Running topic recognition...", minPct: 50 },
      { msg: "Analyzing content gaps...", minPct: 55 },
      { msg: "Auditing NAP data...", minPct: 60 },
      { msg: "Searching for competitors...", minPct: 65 },
      { msg: "Running batch analysis...", minPct: 70 },
      { msg: "Processing results...", minPct: 75 },
      { msg: "Finalizing analysis...", minPct: 78 },
    ]

    let messageIndex = 0
    let currentProgress = 0
    
    // Slower progress: update every 4 seconds, and slow down as we approach 80%
    const progressInterval = setInterval(() => {
      if (messageIndex < progressMessages.length) {
        const step = progressMessages[messageIndex]
        setScanStatus(step.msg)
        
        // Gradually increase progress but cap at 80% until done
        const targetPct = Math.min(step.minPct, 80)
        if (currentProgress < targetPct) {
          currentProgress = targetPct
          setScanProgress(currentProgress)
        }
        messageIndex++
      } else {
        // Keep cycling the last few messages while waiting
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
    }, 4000)

    try {
      const scanResult = await initialScan(normalizedUrl)
      setScanProgress(82)
      setScanStatus("Initial scan complete, running deep analysis...")

      // Attempt deep analysis; use real backend heuristics for topics and content gaps
      let analysisError: string | undefined
      let aiAnalysis: any | undefined
      try {
        setScanStatus("Extracting content chunks...")
        const chunksRes = await getContentChunks(normalizedUrl, 10)
        setScanProgress(85)
        
        const rawQuestions = (chunksRes?.chunks || [])
          .map((c: any) => String(c?.question || ""))
          .filter(Boolean)
        // Simple noise filter for unrelated/political/news questions
        const noise = [/bundestag/i, /regierung/i, /koalition/i, /wahl/i, /ampel/i, /covid|corona/i]
        const filteredQuestions = Array.from(
          new Set(
            rawQuestions
              .map((q) => q.replace(/^#+\s*/, "").trim())
              .filter((q) => q.length > 8 && !noise.some((rx) => rx.test(q)))
          )
        ).slice(0, 8)

        // Topic recognition and content gaps (backend will fetch HTML if content omitted)
        setScanStatus("Running topic recognition...")
        const topic = await postTopicRecognition(
          normalizedUrl,
          "",
          (scanResult as any)?.contentAnalysis?.title
        )
        setScanProgress(88)
        
        setScanStatus("Analyzing content gaps...")
        const gap = await postContentGap(
          normalizedUrl,
          "",
          (scanResult as any)?.contentAnalysis?.title,
          topic?.industry
        )
        setScanProgress(91)

        // NAP audit
        setScanStatus("Auditing NAP data...")
        const napRes = await postNapAudit(normalizedUrl)
        const nap = (napRes as any)?.nap || {}
        setScanProgress(94)

        aiAnalysis = {
          topicRecognition: {
            primaryTopic: topic?.primaryTopic || "",
            secondaryTopics: topic?.secondaryTopics || [],
            industry: topic?.industry || "general",
            contentType: topic?.contentType || "web",
            keywords: topic?.keywords || [],
            entities: topic?.entities || [],
            targetAudience: topic?.targetAudience || "",
            confidence: topic?.confidence ?? 60,
          },
          contentGap: {
            missingTopics: gap?.missingTopics || [],
            missingQuestions: gap?.missingQuestions || [],
            contentScore: gap?.contentScore ?? 50,
            recommendations: [
              ...(gap?.schemaOpportunities || []),
              ...(gap?.summary ? [gap.summary] : []),
            ],
          },
          napData: {
            name: nap?.name ?? null,
            address: nap?.address ?? null,
            phone: nap?.phone ?? null,
            email: null,
            isComplete: !!(nap?.name && nap?.address && nap?.phone),
          },
          factCheck: {
            claims: [],
            overallCredibility: 50,
            recommendations: [],
          },
          userQuestions: filteredQuestions,
        }
      } catch (e: any) {
        analysisError = e?.message || "Content analysis failed"
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
          analysis: ((scanResult as any).analysis || aiAnalysis),
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
