"use client"

import type React from "react"
import { useState } from "react"
import { Copy, Download, Check, FileCode, FileJson, FileText, Code } from "lucide-react"

type Lang = "json" | "yaml" | "xml" | "txt"

export interface ResultCardProps {
  value: string
  language?: Lang
  filename?: string
  className?: string
}

function stripCodeFences(s: string) {
  if (!s) return s
  const withoutOpen = s.replace(/^```[a-zA-Z]*\s*/m, "")
  const withoutClose = withoutOpen.replace(/```$/m, "")
  return withoutClose.trim()
}

function getLanguageIcon(lang: Lang) {
  switch (lang) {
    case "json":
      return FileJson
    case "yaml":
      return FileCode
    case "xml":
      return Code
    default:
      return FileText
  }
}

export const ResultCard: React.FC<ResultCardProps> = ({ value, language = "json", filename, className = "" }) => {
  const clean = stripCodeFences(value || "")
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(clean)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const onDownload = () => {
    try {
      const blob = new Blob([clean], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const ext = language === "json" ? "json" : language === "yaml" ? "yaml" : language === "xml" ? "xml" : "txt"
      a.href = url
      a.download = filename || `output.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {}
  }

  const LangIcon = getLanguageIcon(language)
  const langLabel = language.toUpperCase()

  let displayValue = clean
  if (language === "json" && clean) {
    try {
      const parsed = JSON.parse(clean)
      displayValue = JSON.stringify(parsed, null, 2)
    } catch {
      displayValue = clean
    }
  }

  return (
    <div className={`bg-neuro-900 border border-neuro-800 rounded-xl overflow-hidden ${className}`}>
      <div className="p-3 border-b border-neuro-800 bg-neuro-900/60 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <LangIcon className="w-4 h-4 text-neuro-400" />
          <span className="text-xs font-mono text-slate-400">{langLabel}</span>
          {filename && <span className="text-xs text-slate-600">• {filename}</span>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onCopy}
            className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
              copied ? "text-emerald-400 bg-emerald-500/10" : "text-slate-400 hover:text-white hover:bg-neuro-800"
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={onDownload}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-neuro-800 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
        </div>
      </div>
      <pre className="p-4 text-xs text-slate-300 whitespace-pre-wrap custom-scrollbar max-h-[400px] overflow-auto font-mono leading-relaxed">
        {displayValue}
      </pre>
    </div>
  )
}
