"use client"

import type React from "react"
import { MOCK_PROJECTS } from "../constants"
import type { ClientProject } from "../types"
import { ArrowUpRight, Activity, AlertTriangle, CheckCircle, Plus, Sparkles } from "lucide-react"
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts"

interface DashboardViewProps {
  onSelectProject: (id: string) => void
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onSelectProject }) => {
  return (
    <div className="p-8 animate-fade-in">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold text-white mb-3 tracking-tight">Fleet Overview</h2>
          <p className="text-slate-400 text-lg">Monitoring <span className="text-indigo-400 font-semibold">{MOCK_PROJECTS.length}</span> active client infrastructures.</p>
        </div>
        <button className="glass-button text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 group">
          <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          Run Global Audit
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {MOCK_PROJECTS.map((project, index) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            onClick={() => onSelectProject(project.id)} 
            index={index}
          />
        ))}

        {/* New Client Placeholder */}
        <button className="glass-card border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-12 hover:border-indigo-500/50 hover:bg-white/5 transition-all group min-h-[280px]">
          <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-5 group-hover:scale-110 transition-transform group-hover:shadow-lg group-hover:shadow-indigo-500/20">
            <Plus className="w-8 h-8 text-slate-400 group-hover:text-indigo-400 transition-colors" />
          </div>
          <span className="text-slate-400 font-semibold text-lg group-hover:text-white transition-colors">Onboard New Client</span>
          <span className="text-slate-500 text-sm mt-2">Start a new AI audit</span>
        </button>
      </div>
    </div>
  )
}

const ProjectCard: React.FC<{ project: ClientProject; onClick: () => void; index: number }> = ({ project, onClick, index }) => {
  const isHealthy = project.status === "healthy"
  const isCritical = project.status === "critical"

  const statusColors = {
    healthy: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      glow: "shadow-emerald-500/20"
    },
    critical: {
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      text: "text-rose-400",
      glow: "shadow-rose-500/20"
    },
    warning: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-400",
      glow: "shadow-amber-500/20"
    }
  }

  const status = statusColors[project.status as keyof typeof statusColors] || statusColors.warning

  return (
    <div
      onClick={onClick}
      style={{ animationDelay: `${index * 100}ms` }}
      className="glass-card p-6 hover:border-indigo-500/30 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col h-full relative overflow-hidden group animate-fade-in"
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="flex justify-between items-start mb-5 relative z-10">
        <div>
          <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">{project.name}</h3>
          <a
            href={`https://${project.domain}`}
            className="text-sm text-slate-500 hover:text-indigo-400 flex items-center gap-1.5 mt-1.5 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {project.domain} <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
        <div
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${status.bg} ${status.text} border ${status.border}`}
        >
          {project.status}
        </div>
      </div>

      <div className="flex items-end gap-3 mb-6 relative z-10">
        <div className="score-circle w-20 h-20 rounded-2xl flex items-center justify-center">
          <span className="text-3xl font-mono font-bold text-white">{project.score}</span>
        </div>
        <div className="mb-2">
          <span className="text-sm text-slate-400 block">AI Score</span>
          <span className="text-xs text-slate-500">/ 100 points</span>
        </div>
      </div>

      <div className="h-20 -mx-6 mt-auto relative opacity-60 group-hover:opacity-100 transition-opacity">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={project.trend.map((val, i) => ({ val, i }))}>
            <defs>
              <linearGradient id={`gradient-${project.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={isHealthy ? "#10b981" : isCritical ? "#f43f5e" : "#f59e0b"}
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor={isHealthy ? "#10b981" : isCritical ? "#f43f5e" : "#f59e0b"}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <YAxis hide domain={[0, 100]} />
            <Area
              type="monotone"
              dataKey="val"
              stroke={isHealthy ? "#10b981" : isCritical ? "#f43f5e" : "#f59e0b"}
              fill={`url(#gradient-${project.id})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-6 mt-6 pt-4 border-t border-white/5 relative z-10">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="p-1.5 rounded-lg bg-white/5">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <span>{project.pagesScanned} Pages</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className={`p-1.5 rounded-lg ${isHealthy ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
            {isHealthy ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <span>{project.issues} Issues</span>
        </div>
      </div>
    </div>
  )
}
