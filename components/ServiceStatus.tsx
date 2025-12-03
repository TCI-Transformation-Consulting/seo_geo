"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { getHealth } from "../services/api"
import { Activity, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

type HealthState = "idle" | "ok" | "warn" | "error"

export const ServiceStatus: React.FC = () => {
  const [state, setState] = useState<HealthState>("idle")
  const [msg, setMsg] = useState<string>("Checking service...")

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await getHealth()
        if (!mounted) return
        if (res?.status?.toLowerCase() === "ok") {
          setState("ok")
          setMsg(`Backend Online v${res.version ?? "1.0"}`)
        } else {
          setState("warn")
          setMsg("Backend status not OK")
        }
      } catch (e: any) {
        if (!mounted) return
        setState("error")
        setMsg("Backend offline")
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const StatusIcon =
    state === "ok" ? CheckCircle : state === "warn" ? AlertTriangle : state === "error" ? XCircle : Activity
  const color =
    state === "ok"
      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : state === "warn"
        ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
        : state === "error"
          ? "text-rose-400 border-rose-500/30 bg-rose-500/10"
          : "text-slate-400 border-slate-500/30 bg-slate-500/10"

  const dotColor =
    state === "ok"
      ? "bg-emerald-500"
      : state === "warn"
        ? "bg-amber-500"
        : state === "error"
          ? "bg-rose-500"
          : "bg-slate-500"

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${color}`}>
      <span className={`inline-block w-2 h-2 rounded-full ${dotColor} ${state === "ok" ? "animate-pulse" : ""}`} />
      <StatusIcon className="w-4 h-4" />
      <span className="text-xs font-medium">{msg}</span>
    </div>
  )
}
