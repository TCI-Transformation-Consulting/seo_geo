"use client"

import type React from "react"
import { useState } from "react"
import type { ViewState } from "../types"
import { login } from "../services/api"
import { LogIn, Mail, KeyRound, Loader2, CheckCircle2, AlertCircle, Network, Sparkles } from "lucide-react"

interface LoginViewProps {
  onNavigate: (view: ViewState) => void
}

export const LoginView: React.FC<LoginViewProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)
    try {
      await login(email, password)
      setSuccess(true)
      setTimeout(() => {
        onNavigate("dashboard")
      }, 600)
    } catch (e: any) {
      setError(e?.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen text-slate-50 font-sans flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo above card */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-30 scale-150" />
            <div className="relative glass p-4 rounded-2xl">
              <Network className="w-10 h-10 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">NEURO-WEB</h1>
          <p className="text-indigo-400/80 text-sm font-medium mt-1">AI Readiness Platform</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <LogIn className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Welcome back</h2>
              <p className="text-sm text-slate-400">Sign in to your account</p>
            </div>
          </div>

          {error && (
            <div className="mb-5 glass-badge-error p-4 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-5 glass-badge-success p-4 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Login successful. Redirecting…</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm text-slate-400 font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full glass-input rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-slate-400 font-medium">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full glass-input rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full glass-button disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-3 mt-6"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="text-center text-sm text-slate-500">
              Demo: <span className="text-slate-400">oleg.seifert@tci-partners.com</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-8">
          © 2024 NEURO-WEB · AI Readiness Platform
        </p>
      </div>
    </div>
  )
}

export default LoginView
