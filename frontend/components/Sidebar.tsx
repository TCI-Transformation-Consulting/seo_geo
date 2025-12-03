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
    <div className="w-72 glass-sidebar flex flex-col h-full fixed left-0 top-0 z-10">
      {/* Logo */}
      <div
        className="p-6 flex items-center gap-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all duration-300"
        onClick={() => onNavigate("landing")}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-50"></div>
          <div className="relative glass-button p-3 rounded-xl">
            <Network className="w-6 h-6 text-white" />
          </div>
        </div>
        <div>
          <h1 className="font-bold text-white text-xl tracking-tight">NEURO-WEB</h1>
          <p className="text-indigo-400/80 text-xs font-medium">AI Readiness Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.view
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.view)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-200 ${
                isActive
                  ? "glass-list-item-active text-white font-medium shadow-lg shadow-indigo-500/10"
                  : "glass-list-item text-slate-400 hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-indigo-400" : ""}`} />
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></div>
              )}
            </button>
          )
        })}
      </nav>

      {/* Backend Status */}
      <div className="p-4 border-t border-white/5">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              backendStatus === "online" 
                ? "bg-emerald-500/20 border border-emerald-500/30" 
                : backendStatus === "offline"
                ? "bg-rose-500/20 border border-rose-500/30"
                : "bg-slate-500/20 border border-slate-500/30"
            }`}>
              {backendStatus === "checking" && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
              {backendStatus === "online" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              {backendStatus === "offline" && <XCircle className="w-4 h-4 text-rose-400" />}
            </div>
            <div>
              <span className="text-sm text-white font-medium block">
                Backend {backendStatus === "checking" ? "..." : backendStatus === "online" ? "Online" : "Offline"}
              </span>
              {backendStatus === "online" && (
                <span className="text-xs text-emerald-400/70">All systems operational</span>
              )}
            </div>
          </div>
          {backendStatus === "offline" && (
            <p className="text-xs text-slate-500 mt-3 p-2 bg-rose-500/5 rounded-lg border border-rose-500/10">
              Backend nicht erreichbar
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
