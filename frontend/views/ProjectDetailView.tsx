"use client"

import { useState } from "react"
import type { ClientProject, CheckStatus, InitialScanResult, CompetitorResult, AIAnalysis, TechnicalStatus } from "../types"
import { GENERATION_TYPES } from "../constants"
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Download,
  Copy,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
  Users,
  Trophy,
  Target,
  TrendingUp,
  Shield,
  Swords,
  Crown,
  FileCode,
  Play,
  Eye,
  BarChart3,
  Brain,
  MessageCircleQuestion,
  MapPin,
  ShieldCheck,
  Lightbulb,
  Hash,
  Building,
  Phone,
  Mail,
  Tag,
  Award,
  Info,
  FileText,
  Zap,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Layers,
  Settings,
  Bot,
  Rss,
  Sparkles,
  FileJson,
} from "lucide-react"
import {
  generateJsonLd,
  generateRobots,
  generateSitemap,
  generateRSS,
  generateOpenAPI,
  generateMcpConfig,
  generateAIManifest,
  generateLlmsTxt,
  generateLocalBusinessSchema,
} from "../services/api"
import { postSchemaAudit } from "../services/api"

interface ProjectDetailViewProps {
  project: ClientProject
  onBack: () => void
}

// CodeBlock component for displaying generated files
const CodeBlock = ({ value, filename }: { value: string; filename: string }) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadFile = () => {
    const blob = new Blob([value], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        <button
          onClick={copyToClipboard}
          className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
          title="Copy"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
        <button
          onClick={downloadFile}
          className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
      <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto text-sm text-slate-300 max-h-80">
        <code>{value}</code>
      </pre>
    </div>
  )
}

const getArtifactLabel = (key: string): string => {
  const labels: Record<string, string> = {
    jsonLdSchema: "JSON-LD Schema",
    robotsTxt: "robots.txt",
    sitemap: "Sitemap",
    rssFeed: "RSS Feed",
    llmsTxt: "llms.txt",
    aiManifest: "AI Manifest",
    mcpConfig: "MCP Config",
    openApi: "OpenAPI Spec",
  }
  return labels[key] || key
}

function CompetitorComparisonTable({
  userScore,
  userArtifacts,
  competitors,
}: {
  userScore: number
  userArtifacts: any // relaxed type for compatibility
  competitors: CompetitorResult[]
}) {
  const artifactKeys = [
    "jsonLdSchema",
    "robotsTxt",
    "sitemap",
    "rssFeed",
    "llmsTxt",
    "aiManifest",
    "mcpConfig",
    "openApi",
  ] as const

  const successfulCompetitors = competitors.filter((c) => c.crawledSuccessfully)
  const failedCompetitors = competitors.filter((c) => !c.crawledSuccessfully)
  const benchmarkCompetitor = successfulCompetitors.find((c) => c.isBenchmark)

  if (successfulCompetitors.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="text-center text-slate-400 mb-3">No competitor data available for comparison</div>
        {failedCompetitors.length > 0 && (
          <div className="text-xs text-slate-500 text-center">
            Could not analyze {failedCompetitors.length} competitor{failedCompetitors.length > 1 ? "s" : ""}
            (sites may be blocking automated access or unavailable)
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {benchmarkCompetitor && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-3">
          <Award className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <span className="text-emerald-400 font-medium">{benchmarkCompetitor.name}</span>
            <span className="text-slate-300 text-sm ml-2">
              is a verified benchmark with {benchmarkCompetitor.artifactsFoundCount}/8 artifacts detected (
              {benchmarkCompetitor.artifactsFoundPercentage}%)
            </span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 font-medium text-slate-300">Artifact</th>
              <th className="text-center py-3 px-4 font-medium text-cyan-400">
                <div className="flex items-center justify-center gap-2">
                  <Crown className="w-4 h-4" />
                  Your Site
                </div>
              </th>
              {successfulCompetitors.map((comp, idx) => (
                <th key={idx} className="text-center py-3 px-4 font-medium text-slate-300">
                  <div className="flex flex-col items-center gap-1">
                    {comp.isBenchmark && (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        Benchmark
                      </span>
                    )}
                    <div className="truncate max-w-[120px]" title={comp.name}>
                      {comp.name}
                    </div>
                    {comp.artifactsFoundPercentage !== undefined && (
                      <span className="text-xs text-slate-500">
                        {comp.artifactsFoundCount}/8 ({comp.artifactsFoundPercentage}%)
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Score row */}
            <tr className="border-b border-slate-700/50 bg-slate-800/30">
              <td className="py-3 px-4 font-medium text-white">AI Readiness Score</td>
              <td className="py-3 px-4 text-center">
                <span
                  className={`font-bold text-lg ${userScore >= 70 ? "text-emerald-400" : userScore >= 40 ? "text-amber-400" : "text-red-400"}`}
                >
                  {userScore}
                </span>
              </td>
              {successfulCompetitors.map((comp, idx) => (
                <td key={idx} className="py-3 px-4 text-center">
                  <span
                    className={`font-bold ${
                      comp.score > userScore
                        ? "text-red-400"
                        : comp.score === userScore
                          ? "text-amber-400"
                          : "text-emerald-400"
                    }`}
                  >
                    {comp.score}
                    {comp.score > userScore && <span className="text-xs ml-1">↑</span>}
                  </span>
                </td>
              ))}
            </tr>

            {/* Artifact rows */}
            {artifactKeys.map((key) => {
              const userHas = userArtifacts[key]?.status === "found"
              const competitorStatuses = successfulCompetitors.map((c) => c.artifactChecks[key]?.status === "found")
              const anyCompetitorHas = competitorStatuses.some(Boolean)
              const userMissingButCompetitorHas = !userHas && anyCompetitorHas

              return (
                <tr
                  key={key}
                  className={`border-b border-slate-700/50 ${userMissingButCompetitorHas ? "bg-red-500/5" : ""}`}
                >
                  <td className="py-3 px-4 text-slate-300">
                    {getArtifactLabel(key)}
                    {userMissingButCompetitorHas && <span className="ml-2 text-xs text-red-400 font-medium">Gap!</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {userHas ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                    )}
                  </td>
                  {successfulCompetitors.map((comp, idx) => {
                    const hasIt = comp.artifactChecks[key]?.status === "found"
                    return (
                      <td key={idx} className="py-3 px-4 text-center">
                        {hasIt ? (
                          <CheckCircle2
                            className={`w-5 h-5 mx-auto ${!userHas ? "text-red-400" : "text-emerald-400"}`}
                          />
                        ) : (
                          <XCircle className="w-5 h-5 text-slate-600 mx-auto" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {failedCompetitors.length > 0 && (
        <div className="text-xs text-slate-500 flex items-center gap-2 px-2">
          <AlertTriangle className="w-3 h-3" />
          {failedCompetitors.length} competitor{failedCompetitors.length > 1 ? "s" : ""} could not be analyzed (
          {failedCompetitors.map((c) => c.name).join(", ")})
        </div>
      )}
    </div>
  )
}

function CompetitorCard({ competitor, userScore }: { competitor: CompetitorResult; userScore: number }) {
  const scoreDiff = competitor.score - userScore

  if (!competitor.crawledSuccessfully) {
    return (
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4 opacity-60">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-medium text-slate-400">{competitor.name}</h4>
            <a
              href={competitor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1"
            >
              {competitor.url}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 mb-1">Unable to analyze</div>
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-3">{competitor.description}</p>
        <div className="text-xs text-slate-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Site may be blocking automated access or unavailable
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bg-slate-800/50 border rounded-lg p-4 ${competitor.isBenchmark ? "border-emerald-500/50 ring-1 ring-emerald-500/20" : "border-slate-700"}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-white">{competitor.name}</h4>
            {competitor.isBenchmark && (
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                <Award className="w-3 h-3" />
                Benchmark
              </span>
            )}
          </div>
          <a
            href={competitor.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1"
          >
            {competitor.url}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="text-right">
          {scoreDiff > 0 && <div className="text-xs text-red-400 mb-1">+{scoreDiff} ahead</div>}
          <div
            className={`text-2xl font-bold ${
              competitor.score > userScore
                ? "text-red-400"
                : competitor.score === userScore
                  ? "text-amber-400"
                  : "text-emerald-400"
            }`}
          >
            {competitor.score}
          </div>
          {competitor.artifactsFoundPercentage !== undefined && (
            <div className="text-xs text-slate-500 mt-1">{competitor.artifactsFoundCount}/8 artifacts</div>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-400 mb-3">{competitor.description}</p>

      {competitor.isBenchmark && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-2 mb-3 text-xs text-emerald-300">
          This competitor demonstrates strong AI readiness and serves as a benchmark for comparison.
        </div>
      )}

      {competitor.advantages.length > 0 && (
        <div className="space-y-1">
          {competitor.advantages.map((adv, idx) => (
            <div key={idx} className="text-xs text-amber-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {adv}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AIAnalysisSection({ analysis }: { analysis: AIAnalysis }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["topics", "content", "nap", "ai-visibility"]))

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  return (
    <div className="space-y-4">
      {/* Topic Recognition */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection("topics")}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition"
        >
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-indigo-400" />
            <span className="font-medium">Topic Recognition</span>
          </div>
          {expandedSections.has("topics") ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedSections.has("topics") && (
          <div className="p-4 pt-0 border-t border-slate-700">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Primary Topic</h4>
                <p className="text-white font-medium">{analysis.topicRecognition.primaryTopic}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Industry</h4>
                <p className="text-white capitalize">{analysis.topicRecognition.industry.replace("_", " ")}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Content Type</h4>
                <p className="text-slate-300">{analysis.topicRecognition.contentType}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Target Audience</h4>
                <p className="text-slate-300">{analysis.topicRecognition.targetAudience}</p>
              </div>
            </div>

            {analysis.topicRecognition.secondaryTopics?.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Secondary Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.topicRecognition.secondaryTopics.map((topic, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-700 rounded text-sm text-slate-300">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysis.topicRecognition.keywords?.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-slate-500 uppercase mb-2 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> Keywords
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.topicRecognition.keywords.map((kw, i) => (
                    <span key={i} className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-sm">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysis.topicRecognition.entities?.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-slate-500 uppercase mb-2 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Detected Entities
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.topicRecognition.entities.map((entity, i) => (
                    <span key={i} className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded text-sm">
                      {entity.name} <span className="text-emerald-500/70">({entity.type})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Gap Analysis */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection("content")}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition"
        >
          <div className="flex items-center gap-3">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            <span className="font-medium">Content Gap Analysis</span>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
              Score: {analysis.contentGap.contentScore}/100
            </span>
          </div>
          {expandedSections.has("content") ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedSections.has("content") && (
          <div className="p-4 pt-0 border-t border-slate-700 space-y-4">
            {analysis.contentGap.missingTopics?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-red-400 uppercase mb-2">Missing Topics</h4>
                <ul className="space-y-1">
                  {analysis.contentGap.missingTopics.map((topic, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.contentGap.missingQuestions?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-amber-400 uppercase mb-2">Unanswered Questions</h4>
                <ul className="space-y-1">
                  {analysis.contentGap.missingQuestions.map((q, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <MessageCircleQuestion className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.contentGap.recommendations?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-emerald-400 uppercase mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {analysis.contentGap.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NAP Verification */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection("nap")}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition"
        >
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-cyan-400" />
            <span className="font-medium">Business Information (NAP)</span>
            {analysis.napData.isComplete ? (
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                Complete {analysis.napData.completeness && `(${analysis.napData.completeness})`}
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                Incomplete {analysis.napData.completeness && `(${analysis.napData.completeness})`}
              </span>
            )}
          </div>
          {expandedSections.has("nap") ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedSections.has("nap") && (
          <div className="p-4 pt-0 border-t border-slate-700">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Building className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase">Business Name</h4>
                  <p className={analysis.napData.name ? "text-white" : "text-red-400"}>
                    {analysis.napData.name || "Not found"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase">Address</h4>
                  <p className={analysis.napData.address ? "text-white" : "text-red-400"}>
                    {analysis.napData.address || "Not found"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase">Phone</h4>
                  <p className={analysis.napData.phone ? "text-white" : "text-red-400"}>
                    {analysis.napData.phone || "Not found"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase">Email</h4>
                  <p className={analysis.napData.email ? "text-white" : "text-slate-500"}>
                    {analysis.napData.email || "Not found"}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Scanned Pages Info */}
            {analysis.napData.scannedPages && analysis.napData.scannedPages.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">
                  Scanned Pages ({analysis.napData.scannedPages.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.napData.scannedPages.map((page: string, i: number) => (
                    <a
                      key={i}
                      href={page}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 bg-slate-700/50 text-slate-300 hover:text-cyan-400 rounded truncate max-w-xs"
                    >
                      {new URL(page).pathname || "/"}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fact Check */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection("factcheck")}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-medium">Fact Check & Credibility</span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full ${
                analysis.factCheck.overallCredibility >= 80
                  ? "bg-emerald-500/20 text-emerald-400"
                  : analysis.factCheck.overallCredibility >= 60
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-red-500/20 text-red-400"
              }`}
            >
              {analysis.factCheck.overallCredibility}% Credible
            </span>
          </div>
          {expandedSections.has("factcheck") ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedSections.has("factcheck") && (
          <div className="p-4 pt-0 border-t border-slate-700 space-y-4">
            {analysis.factCheck.claims?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Claims Analyzed</h4>
                <div className="space-y-2">
                  {analysis.factCheck.claims.map((claim, i) => (
                    <div key={i} className="p-3 bg-slate-900/50 rounded-lg">
                      <p className="text-sm text-slate-300">{claim.claim}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {claim.verifiable ? (
                          <span className="text-xs text-emerald-400">Verifiable</span>
                        ) : (
                          <span className="text-xs text-amber-400">Subjective</span>
                        )}
                        {claim.issue && <span className="text-xs text-red-400">Issue: {claim.issue}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.factCheck.recommendations?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-emerald-400 uppercase mb-2">Credibility Improvements</h4>
                <ul className="space-y-1">
                  {analysis.factCheck.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Visibility Framework */}
      {analysis.aiVisibility && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection("ai-visibility")}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition"
          >
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-indigo-400" />
              <span className="font-medium">AI Visibility Score</span>
              <span
                className={`px-3 py-1 text-sm font-bold rounded-full ${
                  analysis.aiVisibility.grade === "A"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : analysis.aiVisibility.grade === "B"
                      ? "bg-blue-500/20 text-blue-400"
                      : analysis.aiVisibility.grade === "C"
                        ? "bg-amber-500/20 text-amber-400"
                        : analysis.aiVisibility.grade === "D"
                          ? "bg-orange-500/20 text-orange-400"
                          : "bg-red-500/20 text-red-400"
                }`}
              >
                {analysis.aiVisibility.totalScore}/100 (Grade {analysis.aiVisibility.grade})
              </span>
            </div>
            {expandedSections.has("ai-visibility") ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSections.has("ai-visibility") && (
            <div className="p-4 pt-0 border-t border-slate-700 space-y-4">
              {/* Summary */}
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                <p className="text-sm text-slate-200">{analysis.aiVisibility.summary}</p>
              </div>

              {/* Breakdown: Ungrounded + Grounded */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Ungrounded Recall */}
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  <h4 className="text-xs font-medium text-slate-400 uppercase mb-2 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Ungrounded Recall (40%)
                  </h4>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl font-bold text-white">{analysis.aiVisibility.ungroundedScore}/100</div>
                  </div>
                  <p className="text-xs text-slate-400">
                    How well AI remembers your brand without being given your website content.
                  </p>
                </div>

                {/* Grounded Answerability */}
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  <h4 className="text-xs font-medium text-slate-400 uppercase mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Grounded Answerability (60%)
                  </h4>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl font-bold text-white">{analysis.aiVisibility.groundedPercentage}%</div>
                  </div>
                  <p className="text-xs text-slate-400">
                    Percentage of user questions the AI can answer using your website content.
                  </p>
                </div>
              </div>

              {/* Priority Actions */}
              {analysis.aiVisibility.priorityActions?.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-amber-400 uppercase mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Priority Actions
                  </h4>
                  <ul className="space-y-2">
                    {analysis.aiVisibility.priorityActions.map((action, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2 p-2 bg-amber-500/10 rounded">
                        <span className="text-amber-400 mt-0.5">→</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Content Gaps */}
              {analysis.aiVisibility.contentGaps?.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-red-400 uppercase mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Content Gaps Detected
                  </h4>
                  <ul className="space-y-1">
                    {analysis.aiVisibility.contentGaps.map((gap, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Question-Level Results */}
              {analysis.aiVisibility.groundedResults?.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <MessageCircleQuestion className="w-4 h-4" />
                    Question-Level Analysis ({analysis.aiVisibility.groundedResults.length} questions tested)
                  </h4>
                  <div className="space-y-2">
                    {analysis.aiVisibility.groundedResults.map((result, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border ${
                          result.answerable && result.answer_quality !== "none"
                            ? "bg-emerald-500/10 border-emerald-500/20"
                            : "bg-red-500/10 border-red-500/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-white flex-1">Q: {result.question}</p>
                          {result.answerable && result.answer_quality !== "none" ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )}
                        </div>
                        {result.answer_preview && (
                          <p className="text-xs text-slate-400 mb-2">
                            <strong>Answer:</strong> {result.answer_preview}
                          </p>
                        )}
                        {result.missing_info && (
                          <p className="text-xs text-amber-400 mb-2">
                            <strong>Missing:</strong> {result.missing_info}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs">
                          <span
                            className={
                              result.answerable && result.answer_quality !== "none" ? "text-emerald-400" : "text-red-400"
                            }
                          >
                            {result.answerable && result.answer_quality !== "none" ? "✓ Answerable" : "✗ Not answerable"}
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className={`capitalize ${
                            result.answer_quality === "complete" ? "text-emerald-400" :
                            result.answer_quality === "partial" ? "text-amber-400" :
                            "text-red-400"
                          }`}>
                            {result.answer_quality}
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">Score: {result.score}/{result.max_score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* User Questions */}
      {analysis.userQuestions?.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection("questions")}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition"
          >
            <div className="flex items-center gap-3">
              <MessageCircleQuestion className="w-5 h-5 text-purple-400" />
              <span className="font-medium">Potential User Questions</span>
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                {analysis.userQuestions.length} questions
              </span>
            </div>
            {expandedSections.has("questions") ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {expandedSections.has("questions") && (
            <div className="p-4 pt-0 border-t border-slate-700">
              <p className="text-xs text-slate-500 mb-3">
                These are questions users might ask AI assistants about your business. Ensure your content answers them.
              </p>
              <ul className="space-y-2">
                {analysis.userQuestions.map((q, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2 p-2 bg-slate-900/50 rounded">
                    <span className="text-purple-400 font-medium">Q:</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InitialScanResults({ scan }: { scan: InitialScanResult }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["score", "analysis", "ai-ready"]))

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-400"
    if (score >= 40) return "text-amber-400"
    return "text-red-400"
  }

  const getPercentileLabel = (percentile: string) => {
    switch (percentile) {
      case "top10":
        return { label: "Top 10%", color: "text-emerald-400", bg: "bg-emerald-500/20" }
      case "top25":
        return { label: "Top 25%", color: "text-cyan-400", bg: "bg-cyan-500/20" }
      case "aboveAverage":
        return { label: "Above Average", color: "text-amber-400", bg: "bg-amber-500/20" }
      default:
        return { label: "Below Average", color: "text-red-400", bg: "bg-red-500/20" }
    }
  }

  const percentileInfo = getPercentileLabel(scan.scoreContext?.percentile || "belowAverage")
  const hasCompetitorAdvantages = scan.competitors?.some((c) => c.advantages && c.advantages.length > 0)

  return (
    <div className="space-y-6">
      {/* Score Section */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <button onClick={() => toggleSection("score")} className="w-full flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <Target className="w-6 h-6 text-indigo-400" />
            AI Readiness Score
          </h2>
          {expandedSections.has("score") ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {expandedSections.has("score") && (
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            {/* Your Score */}
            <div className="text-center">
              <div className={`text-6xl font-bold ${getScoreColor(scan.score)}`}>{scan.score}</div>
              <div className="text-slate-400 mt-1">out of 100</div>
              <div className={`inline-block mt-3 px-3 py-1 rounded-full ${percentileInfo.bg} ${percentileInfo.color}`}>
                {percentileInfo.label} in {scan.industry?.replace("_", " ") || "General"}
              </div>
            </div>

            {/* Benchmark Comparison */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-400">Industry Benchmarks</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Industry Average</span>
                  <span className="text-sm font-medium">{scan.benchmark?.average || 0}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-500 rounded-full relative"
                    style={{ width: `${scan.benchmark?.average || 0}%` }}
                  >
                    <div
                      className={`absolute top-0 h-full w-1 ${scan.score >= (scan.benchmark?.average || 0) ? "bg-emerald-400" : "bg-red-400"}`}
                      style={{ left: `${(scan.score / (scan.benchmark?.average || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-slate-300">Top 25%</span>
                  <span className="text-sm font-medium">{scan.benchmark?.top25 || 0}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500/50 rounded-full"
                    style={{ width: `${scan.benchmark?.top25 || 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-slate-300">Top 10%</span>
                  <span className="text-sm font-medium">{scan.benchmark?.top10 || 0}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/50 rounded-full"
                    style={{ width: `${scan.benchmark?.top10 || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Technical Highlights */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <button onClick={() => toggleSection("tech")} className="w-full flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <Settings className="w-6 h-6 text-cyan-400" />
            Technical Highlights
          </h2>
          {expandedSections.has("tech") ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {expandedSections.has("tech") && (
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            {/* Schema Completeness */}
            <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
              <div className="text-sm text-slate-400 flex items-center gap-2 mb-1">
                <FileCode className="w-4 h-4 text-indigo-400" />
                Schema Completeness (homepage)
              </div>
              <div className="text-2xl font-bold text-indigo-300">
                {scan.technicalStatus?.schemaCompleteness ?? 0}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Based on detected JSON-LD types and required/recommended properties.
              </div>
            </div>

            {/* Agent Readiness */}
            <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
              <div className="text-sm text-slate-400 flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-emerald-400" />
                Agent Readiness
              </div>
              <div
                className={`text-lg font-semibold ${
                  scan.technicalStatus?.agentReadiness ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {scan.technicalStatus?.agentReadiness ? "Ready for AI agents" : "Basic Setup"}
              </div>
              <div className="text-xs text-slate-500 mt-2">AI Integration Status</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { key: "llmsTxtFound", label: "llms.txt" },
                  { key: "aiManifestFound", label: "AI Manifest" },
                  { key: "mcpConfigFound", label: "MCP Config" },
                  { key: "openApiFound", label: "OpenAPI" },
                ].map((k) => {
                  const has = scan.technicalStatus?.[k.key as keyof typeof scan.technicalStatus]
                  return (
                    <span
                      key={k.key}
                      className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                        has
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                          : "bg-red-500/10 text-red-300 border border-red-500/30"
                      }`}
                    >
                      {has ? "✓" : "✗"} {k.label}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Canonical URL */}
            <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
              <div className="text-sm text-slate-400 flex items-center gap-2 mb-1">
                <FileCode className="w-4 h-4 text-cyan-400" />
                Canonical URL
              </div>
              {scan.technicalStatus?.canonicalUrl ? (
                <a
                  href={scan.technicalStatus.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-200 hover:text-cyan-400 break-all"
                >
                  {scan.technicalStatus.canonicalUrl}
                </a>
              ) : (
                <div className="text-slate-500">None detected</div>
              )}
            </div>

            {/* Robots meta flags */}
            <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
              <div className="text-sm text-slate-400 flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-amber-400" />
                Robots Meta
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    scan.technicalStatus?.robotsNoindex
                      ? "bg-rose-500/20 text-rose-300"
                      : "bg-slate-700/50 text-slate-400"
                  }`}
                >
                  noindex {scan.technicalStatus?.robotsNoindex ? "on" : "off"}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    scan.technicalStatus?.robotsNoarchive
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-slate-700/50 text-slate-400"
                  }`}
                >
                  noarchive {scan.technicalStatus?.robotsNoarchive ? "on" : "off"}
                </span>
              </div>
            </div>

            {/* AI Crawler Directives */}
            <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4 md:col-span-2">
              <div className="text-sm text-slate-400 flex items-center gap-2 mb-1">
                <Info className="w-4 h-4 text-purple-400" />
                AI Crawler Directives (robots.txt)
              </div>
              {Array.isArray(scan.technicalStatus?.aiCrawlerDirectives) &&
              scan.technicalStatus.aiCrawlerDirectives.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {scan.technicalStatus.aiCrawlerDirectives.map((d, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500">No AI crawler directives detected</div>
              )}
            </div>

            {/* Visibility Baseline */}
            <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4 md:col-span-2">
              <div className="text-sm text-slate-400 flex items-center gap-2 mb-1">
                <Eye className="w-4 h-4 text-cyan-400" />
                AI Visibility Score
              </div>
              <div className="flex items-center gap-3">
                {scan.analysis?.aiVisibility ? (
                  <>
                    <span className={`text-2xl font-bold ${
                      scan.analysis.aiVisibility.grade === "A" ? "text-emerald-400" :
                      scan.analysis.aiVisibility.grade === "B" ? "text-blue-400" :
                      scan.analysis.aiVisibility.grade === "C" ? "text-amber-400" :
                      scan.analysis.aiVisibility.grade === "D" ? "text-orange-400" :
                      "text-red-400"
                    }`}>
                      {scan.analysis.aiVisibility.totalScore}/100
                    </span>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      scan.analysis.aiVisibility.grade === "A" ? "bg-emerald-500/20 text-emerald-400" :
                      scan.analysis.aiVisibility.grade === "B" ? "bg-blue-500/20 text-blue-400" :
                      scan.analysis.aiVisibility.grade === "C" ? "bg-amber-500/20 text-amber-400" :
                      scan.analysis.aiVisibility.grade === "D" ? "bg-orange-500/20 text-orange-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>
                      Grade {scan.analysis.aiVisibility.grade}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400 text-sm">
                    {scan.technicalStatus?.visibilityBaseline === 2
                      ? "Strong (Organization/LocalBusiness + contact signals)"
                      : scan.technicalStatus?.visibilityBaseline === 1
                        ? "Basic (Organization/LocalBusiness detected)"
                        : "Run full analysis for AI Visibility Score"}
                  </span>
                )}
              </div>
            </div>

            {/* H1 Structure Audit */}
            <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4 md:col-span-2">
              <div className="text-sm text-slate-400 flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-amber-400" />
                Heading Structure (SEO)
              </div>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    scan.technicalStatus?.h1Count === 1 ? "text-emerald-400" : 
                    scan.technicalStatus?.h1Count === 0 ? "text-red-400" : "text-amber-400"
                  }`}>
                    {scan.technicalStatus?.h1Count ?? scan.contentAnalysis?.headingStructure?.h1 ?? 0}
                  </div>
                  <div className="text-xs text-slate-500">H1 Tags</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-300">
                    {scan.technicalStatus?.h2Count ?? scan.contentAnalysis?.headingStructure?.h2 ?? 0}
                  </div>
                  <div className="text-xs text-slate-500">H2 Tags</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-300">
                    {scan.technicalStatus?.h3Count ?? scan.contentAnalysis?.headingStructure?.h3 ?? 0}
                  </div>
                  <div className="text-xs text-slate-500">H3 Tags</div>
                </div>
              </div>
              {scan.technicalStatus?.h1Texts && scan.technicalStatus.h1Texts.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">H1 Content:</div>
                  <div className="space-y-1">
                    {scan.technicalStatus.h1Texts.map((h1: string, i: number) => (
                      <div key={i} className="text-sm text-slate-200 bg-slate-800/50 px-2 py-1 rounded truncate">
                        {h1}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(scan.technicalStatus?.h1Count ?? 0) === 0 && (
                <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Missing H1 tag - add a single descriptive H1 heading
                </div>
              )}
              {(scan.technicalStatus?.h1Count ?? 0) > 1 && (
                <div className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Multiple H1 tags detected - consider using only one H1 per page
                </div>
              )}
              {scan.analysis?.seoData?.h1Assessment && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <div className="text-xs text-slate-500 mb-1">AI Assessment:</div>
                  <p className="text-sm text-slate-300">{scan.analysis.seoData.h1Assessment}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {scan.analysis && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <button onClick={() => toggleSection("analysis")} className="w-full flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <Brain className="w-6 h-6 text-purple-400" />
              AI Content Analysis
            </h2>
            {expandedSections.has("analysis") ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {expandedSections.has("analysis") && (
            <div className="mt-6">
              <AIAnalysisSection analysis={scan.analysis} />
            </div>
          )}
        </div>
      )}

      {scan.competitors && scan.competitors.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <button onClick={() => toggleSection("competitors")} className="w-full flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <Users className="w-6 h-6 text-indigo-400" />
              Competitor Analysis
              {hasCompetitorAdvantages && (
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">Gaps Found</span>
              )}
            </h2>
            {expandedSections.has("competitors") ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          {expandedSections.has("competitors") && (
            <div className="mt-6 space-y-6">
              {/* Comparison Summary */}
              {scan.competitorComparison && (
                <div
                  className={`border rounded-lg p-4 ${hasCompetitorAdvantages ? "bg-red-500/10 border-red-500/30" : "bg-indigo-500/10 border-indigo-500/30"}`}
                >
                  <h4
                    className={`font-medium mb-2 flex items-center gap-2 ${hasCompetitorAdvantages ? "text-red-300" : "text-indigo-300"}`}
                  >
                    {hasCompetitorAdvantages ? (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        Competitive Gap Analysis
                      </>
                    ) : (
                      <>
                        <Trophy className="w-4 h-4" />
                        Competitive Position
                      </>
                    )}
                  </h4>
                  <p className="text-sm text-slate-300">{scan.competitorComparison}</p>
                </div>
              )}

              {/* Comparison Table */}
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-3">Side-by-Side Comparison</h4>
                {(() => {
                  const tech = scan.technicalStatus || {}
                  const userArtifacts = {
                    jsonLdSchema: { status: tech.schema ? "found" : "not_found", types: tech.schemaTypes || [] },
                    robotsTxt: { status: tech.robotsTxt ? "found" : "not_found" },
                    sitemap: { status: tech.sitemap ? "found" : "not_found" },
                    rssFeed: { status: tech.rssFeed ? "found" : "not_found" },
                    llmsTxt: { status: tech.llmsTxtFound ? "found" : "not_found" },
                    aiManifest: { status: tech.aiManifestFound ? "found" : "not_found" },
                    mcpConfig: { status: tech.mcpConfigFound ? "found" : "not_found" },
                    openApi: { status: tech.openApiFound ? "found" : "not_found" },
                  }
                  return (
                    <CompetitorComparisonTable
                      userScore={scan.score}
                      userArtifacts={userArtifacts}
                      competitors={scan.competitors}
                    />
                  )
                })()}
              </div>

              {/* Individual Competitor Cards */}
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-3">Competitor Details</h4>
                <div className="space-y-3">
                  {scan.competitors.map((comp, idx) => (
                    <CompetitorCard key={idx} competitor={comp} userScore={scan.score} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Issues Summary */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <button onClick={() => toggleSection("issues")} className="w-full flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            Issues Found
            <span className="text-sm font-normal text-slate-400">
              ({(scan.issues?.critical || 0) + (scan.issues?.warnings || 0) + (scan.issues?.suggestions || 0)} total)
            </span>
          </h2>
          {expandedSections.has("issues") ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {expandedSections.has("issues") && (
          <div className="mt-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-400">{scan.issues?.critical || 0}</div>
                <div className="text-sm text-red-300">Critical</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-amber-400">{scan.issues?.warnings || 0}</div>
                <div className="text-sm text-amber-300">Warnings</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-400">{scan.issues?.suggestions || 0}</div>
                <div className="text-sm text-blue-300">Suggestions</div>
              </div>
            </div>

            <div className="space-y-3">
              {scan.findings?.map((finding) => (
                <div
                  key={finding.id}
                  className={`border rounded-lg p-4 ${
                    finding.severity === "critical"
                      ? "bg-red-500/10 border-red-500/30"
                      : finding.severity === "warning"
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-blue-500/10 border-blue-500/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {finding.severity === "critical" ? (
                      <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
                    ) : finding.severity === "warning" ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-white">{finding.title}</h4>
                        <span className="text-xs text-slate-500">{finding.category}</span>
                      </div>
                      <p className="text-sm text-slate-300 mt-1">{finding.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI-Ready Files & Artifact Checks - Combined Tab */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <button onClick={() => toggleSection("ai-ready")} className="w-full flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-amber-400" />
            AI-Ready Files & Artifacts
          </h2>
          {expandedSections.has("ai-ready") ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {expandedSections.has("ai-ready") && (
          <div className="mt-6 space-y-8">
            {/* Generate AI-Ready Files Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-indigo-400" />
                Generate Files
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                One-click generation of structured data and configuration files to improve AI discoverability.
              </p>
              <GenerateFilesSection project={project} />
            </div>

            {/* Artifact Status Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                Artifact Status
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {(() => {
                  const tech = scan.technicalStatus || {}
                  const artifactChecks = {
                    jsonLdSchema: { status: tech.schema ? "found" : "not_found", types: tech.schemaTypes || [] },
                    robotsTxt: { status: tech.robotsTxt ? "found" : "not_found", hasAiDirectives: tech.robotsAiOptimized },
                    sitemap: { status: tech.sitemap ? "found" : "not_found", urlCount: tech.sitemapUrls },
                    rssFeed: { status: tech.rssFeed ? "found" : "not_found", itemCount: tech.rssItems },
                    llmsTxt: { status: tech.llmsTxtFound ? "found" : "not_found" },
                    aiManifest: { status: tech.aiManifestFound ? "found" : "not_found" },
                    mcpConfig: { status: tech.mcpConfigFound ? "found" : "not_found" },
                    openApi: { status: tech.openApiFound ? "found" : "not_found" },
                  }

                  return Object.entries(artifactChecks).map(([key, value]) => {
                    const competitorHasIt = scan.competitors?.some(
                      (c) => c.artifactChecks?.[key as keyof typeof c.artifactChecks]?.status === "found",
                    )
                    const userMissingCompetitorHas = value.status !== "found" && competitorHasIt

                    return (
                      <div
                        key={key}
                        className={`border rounded-lg p-4 ${
                          value.status === "found"
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : value.status === "not_found"
                              ? userMissingCompetitorHas
                                ? "bg-red-500/10 border-red-500/30"
                                : "bg-slate-700/50 border-slate-600"
                              : "bg-amber-500/10 border-amber-500/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">{getArtifactLabel(key)}</span>
                          <div className="flex items-center gap-2">
                            {userMissingCompetitorHas && <span className="text-xs text-red-400">Competitor has this</span>}
                            {value.status === "found" ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : value.status === "not_found" ? (
                              <XCircle
                                className={`w-5 h-5 ${userMissingCompetitorHas ? "text-red-400" : "text-slate-500"}`}
                              />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-amber-400" />
                            )}
                          </div>
                        </div>

                        {/* Show additional details */}
                        {"types" in value && value.types && value.types.length > 0 && (
                          <div className="mt-2 text-xs text-slate-400">Types: {value.types.join(", ")}</div>
                        )}
                        {"urlCount" in value && typeof value.urlCount === "number" && value.urlCount > 0 && (
                          <div className="mt-2 text-xs text-slate-400">{value.urlCount} URLs indexed</div>
                        )}
                        {"itemCount" in value && typeof value.itemCount === "number" && value.itemCount > 0 && (
                          <div className="mt-2 text-xs text-slate-400">{value.itemCount} items</div>
                        )}
                        {"hasAiDirectives" in value && value.status === "found" && (
                          <div className="mt-2 text-xs text-slate-400">
                            AI directives: {value.hasAiDirectives ? "Yes" : "No"}
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* OLD Artifact Checks section - keeping for reference, will be removed */}
      <div style={{display: 'none'}} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <button onClick={() => toggleSection("artifacts-old")} className="w-full flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <Shield className="w-6 h-6 text-cyan-400" />
            Artifact Checks (OLD - Hidden)
          </h2>
          {expandedSections.has("artifacts-old") ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {expandedSections.has("artifacts-old") && (
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            {(() => {
              const tech = scan.technicalStatus || {}
              const artifactChecks = {
                jsonLdSchema: { status: tech.schema ? "found" : "not_found", types: tech.schemaTypes || [] },
                robotsTxt: { status: tech.robotsTxt ? "found" : "not_found", hasAiDirectives: tech.robotsAiOptimized },
                sitemap: { status: tech.sitemap ? "found" : "not_found", urlCount: tech.sitemapUrls },
                rssFeed: { status: tech.rssFeed ? "found" : "not_found", itemCount: tech.rssItems },
                llmsTxt: { status: tech.llmsTxtFound ? "found" : "not_found" },
                aiManifest: { status: tech.aiManifestFound ? "found" : "not_found" },
                mcpConfig: { status: tech.mcpConfigFound ? "found" : "not_found" },
                openApi: { status: tech.openApiFound ? "found" : "not_found" },
              }

              return Object.entries(artifactChecks).map(([key, value]) => {
                const competitorHasIt = scan.competitors?.some(
                  (c) => c.artifactChecks?.[key as keyof typeof c.artifactChecks]?.status === "found",
                )
                const userMissingCompetitorHas = value.status !== "found" && competitorHasIt

                return (
                  <div
                    key={key}
                    className={`border rounded-lg p-4 ${
                      value.status === "found"
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : value.status === "not_found"
                          ? userMissingCompetitorHas
                            ? "bg-red-500/10 border-red-500/30"
                            : "bg-slate-700/50 border-slate-600"
                          : "bg-amber-500/10 border-amber-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{getArtifactLabel(key)}</span>
                      <div className="flex items-center gap-2">
                        {userMissingCompetitorHas && <span className="text-xs text-red-400">Competitor has this</span>}
                        {value.status === "found" ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : value.status === "not_found" ? (
                          <XCircle
                            className={`w-5 h-5 ${userMissingCompetitorHas ? "text-red-400" : "text-slate-500"}`}
                          />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                    </div>

                    {/* Show additional details */}
                    {"types" in value && value.types && value.types.length > 0 && (
                      <div className="mt-2 text-xs text-slate-400">Types: {value.types.join(", ")}</div>
                    )}
                    {"urlCount" in value && typeof value.urlCount === "number" && value.urlCount > 0 && (
                      <div className="mt-2 text-xs text-slate-400">{value.urlCount} URLs indexed</div>
                    )}
                    {"itemCount" in value && typeof value.itemCount === "number" && value.itemCount > 0 && (
                      <div className="mt-2 text-xs text-slate-400">{value.itemCount} items</div>
                    )}
                    {"hasAiDirectives" in value && value.status === "found" && (
                      <div className="mt-2 text-xs text-slate-400">
                        AI directives: {value.hasAiDirectives ? "Yes" : "No"}
                      </div>
                    )}
                  </div>
                )
              })
            })()}
          </div>
        )}
      </div>

      {/* Opportunities */}
      {scan.opportunities && scan.opportunities.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <button onClick={() => toggleSection("opportunities")} className="w-full flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              Improvement Opportunities
            </h2>
            {expandedSections.has("opportunities") ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          {expandedSections.has("opportunities") && (
            <div className="mt-6 space-y-3">
              {scan.opportunities.map((opp) => (
                <div key={opp.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-white">{opp.title}</h4>
                      <p className="text-sm text-slate-400 mt-1">{opp.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-400 font-bold">+{opp.estimatedScoreGain}</div>
                      <div className="text-xs text-slate-500">points</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        opp.impact === "high"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : opp.impact === "medium"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-slate-600 text-slate-300"
                      }`}
                    >
                      {opp.impact} impact
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Main exported component
export function ProjectDetailView({ project, onBack }: ProjectDetailViewProps) {
  const [activeTab, setActiveTab] = useState<string>("overview")
  
  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">No project selected</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <p className="text-slate-400">{project.domain}</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <div className="text-3xl font-bold text-white">{project.score}</div>
              <div className="text-sm text-slate-400">AI Readiness Score</div>
            </div>
          </div>
        </div>

        {/* Initial Scan Results */}
        {project.initialScan && (
          <InitialScanResults scan={project.initialScan} />
        )}

        {/* Competitor Analysis */}
        {project.competitors && project.competitors.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Swords className="w-5 h-5 text-indigo-400" />
              Competitor Analysis
            </h2>
            <CompetitorComparisonTable 
              userScore={project.score}
              userArtifacts={project.initialScan?.artifacts || {}}
              competitors={project.competitors}
            />
          </div>
        )}

        {/* AI Analysis */}
        {project.aiAnalysis && (
          <AIAnalysisSection analysis={project.aiAnalysis} />
        )}
      </div>
    </div>
  )
}

// Generate Files Section Component
const GenerateFilesSection: React.FC<{ project: ClientProject }> = ({ project }) => {
  const [generatedFiles, setGeneratedFiles] = useState<Record<string, { content: string; loading: boolean; error?: string }>>({})
  const [expandedFile, setExpandedFile] = useState<string | null>(null)

  const generateFile = async (type: string, generator: () => Promise<any>, extractKey: string) => {
    setGeneratedFiles(prev => ({ ...prev, [type]: { content: "", loading: true } }))
    try {
      const result = await generator()
      const content = result[extractKey] || result.content || JSON.stringify(result, null, 2)
      setGeneratedFiles(prev => ({ ...prev, [type]: { content, loading: false } }))
      setExpandedFile(type)
    } catch (e: any) {
      setGeneratedFiles(prev => ({ ...prev, [type]: { content: "", loading: false, error: e.message } }))
    }
  }

  const fileTypes = [
    { 
      id: "jsonld", 
      name: "JSON-LD Schema", 
      description: "Structured data for search engines",
      icon: FileCode,
      generate: () => generateJsonLd(project.url, "Organization"),
      extractKey: "jsonld"
    },
    { 
      id: "localbusiness", 
      name: "LocalBusiness Schema", 
      description: "Local business structured data",
      icon: Building,
      generate: () => generateLocalBusinessSchema(project.url),
      extractKey: "schema"
    },
    { 
      id: "robots", 
      name: "robots.txt", 
      description: "Crawler directives with AI bot rules",
      icon: Bot,
      generate: () => generateRobots(project.url),
      extractKey: "robots"
    },
    { 
      id: "sitemap", 
      name: "sitemap.xml", 
      description: "XML sitemap for search engines",
      icon: FileJson,
      generate: () => generateSitemap(project.url),
      extractKey: "sitemap"
    },
    { 
      id: "llmstxt", 
      name: "llms.txt", 
      description: "AI/LLM usage policy file",
      icon: Bot,
      generate: () => generateLlmsTxt(project.url),
      extractKey: "llms_txt"
    },
    { 
      id: "rss", 
      name: "RSS Feed", 
      description: "Content syndication feed",
      icon: Rss,
      generate: () => generateRSS(project.url),
      extractKey: "rss"
    },
    { 
      id: "aimanifest", 
      name: "AI Manifest", 
      description: "AI capabilities manifest",
      icon: Sparkles,
      generate: () => generateAIManifest(project.url),
      extractKey: "manifest"
    },
    { 
      id: "mcpconfig", 
      name: "MCP Config", 
      description: "Model Context Protocol config",
      icon: Settings,
      generate: () => generateMcpConfig(project.url),
      extractKey: "config"
    },
    { 
      id: "openapi", 
      name: "OpenAPI Spec", 
      description: "API specification",
      icon: FileCode,
      generate: () => generateOpenAPI(project.url),
      extractKey: "openapi"
    },
  ]

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-amber-400" />
        Generate AI-Ready Files
      </h2>
      <p className="text-slate-400 text-sm mb-4">
        One-click generation of structured data and configuration files to improve AI discoverability.
      </p>
      
      <div className="grid md:grid-cols-3 gap-3">
        {fileTypes.map(ft => {
          const Icon = ft.icon
          const file = generatedFiles[ft.id]
          
          return (
            <div key={ft.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-indigo-400" />
                  <span className="font-medium text-white">{ft.name}</span>
                </div>
                {file?.content && !file.loading && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <p className="text-xs text-slate-500 mb-3">{ft.description}</p>
              
              {file?.error ? (
                <div className="text-xs text-red-400 mb-2">{file.error}</div>
              ) : null}
              
              {file?.content && !file.loading ? (
                <div className="space-y-2">
                  <button
                    onClick={() => setExpandedFile(expandedFile === ft.id ? null : ft.id)}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {expandedFile === ft.id ? "Hide" : "View"} generated file
                  </button>
                  {expandedFile === ft.id && (
                    <CodeBlock value={file.content} filename={ft.name} />
                  )}
                </div>
              ) : (
                <button
                  onClick={() => generateFile(ft.id, ft.generate, ft.extractKey)}
                  disabled={file?.loading}
                  className="w-full py-2 px-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded text-sm font-medium transition disabled:opacity-50"
                >
                  {file?.loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    "Generate"
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ProjectDetailView
