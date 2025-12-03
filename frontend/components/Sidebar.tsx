"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { NAV_ITEMS } from "../constants"
import type { ViewState } from "../types"
import { Network, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { getHealth } from "../services/api"

interface SidebarProps {
  currentView: ViewState
  onNavigate: (view: ViewState) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking")

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await getHealth()
        setBackendStatus(res?.status?.toLowerCase() === "ok" ? "online" : "offline")
      } catch {
        setBackendStatus("offline")
      }
    }
    checkStatus()
    const interval = setInterval(checkStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full fixed left-0 top-0 z-10">
      {/* Logo */}
      <div
        className="p-6 flex items-center gap-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={() => onNavigate("landing")}
      >
        <div className="bg-indigo-500 p-2 rounded-lg">
          <Network className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-white text-lg tracking-tight">NEURO-WEB</h1>
          <p className="text-indigo-400 text-xs">AI Readiness Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.view
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.view)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                isActive
                  ? "bg-indigo-500/20 text-indigo-400 font-medium"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-indigo-400" : ""}`} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Backend Status */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            {backendStatus === "checking" && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
            {backendStatus === "online" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
            {backendStatus === "offline" && <XCircle className="w-4 h-4 text-rose-400" />}
            <span className="text-sm text-slate-300">
              Backend{" "}
              {backendStatus === "checking" ? "Connecting..." : backendStatus === "online" ? "Online" : "Offline"}
            </span>
          </div>
          {backendStatus === "offline" && (
            <p className="text-xs text-slate-500">Start backend: cd backend && python main.py</p>
          )}
        </div>
      </div>
    </div>
  )
}
