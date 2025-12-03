"use client"

import type React from "react"
import { MOCK_PROJECTS } from "../constants"
import type { ClientProject } from "../types"
import { ArrowUpRight, Activity, AlertTriangle, CheckCircle } from "lucide-react"
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts"

interface DashboardViewProps {
  onSelectProject: (id: string) => void
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onSelectProject }) => {
  return (
    <div className="p-8 animate-fade-in">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Fleet Overview</h2>
          <p className="text-slate-400">Monitoring {MOCK_PROJECTS.length} active client infrastructures.</p>
        </div>
        <button className="bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Run Global Audit
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {MOCK_PROJECTS.map((project) => (
          <ProjectCard key={project.id} project={project} onClick={() => onSelectProject(project.id)} />
        ))}

        {/* New Client Placeholder */}
        <button className="border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center p-12 hover:border-indigo-500 hover:bg-slate-800/30 transition-all group min-h-[250px]">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-indigo-500 transition-colors">
            <span className="text-2xl text-slate-400 group-hover:text-white">+</span>
          </div>
          <span className="text-slate-400 font-medium group-hover:text-white">Onboard New Client</span>
        </button>
      </div>
    </div>
  )
}

const ProjectCard: React.FC<{ project: ClientProject; onClick: () => void }> = ({ project, onClick }) => {
  const isHealthy = project.status === "healthy"
  const isCritical = project.status === "critical"

  return (
    <div
      onClick={onClick}
      className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-indigo-500 transition-all cursor-pointer hover:shadow-xl hover:shadow-slate-900/50 flex flex-col h-full relative overflow-hidden group"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">{project.name}</h3>
          <a
            href={`https://${project.domain}`}
            className="text-sm text-slate-500 hover:text-slate-300 flex items-center gap-1 mt-1"
            onClick={(e) => e.stopPropagation()}
          >
            {project.domain} <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isHealthy
              ? "bg-emerald-500/10 text-emerald-400"
              : isCritical
                ? "bg-rose-500/10 text-rose-400"
                : "bg-amber-500/10 text-amber-400"
          }`}
        >
          {project.status}
        </div>
      </div>

      <div className="flex items-end gap-2 mb-6">
        <span className="text-4xl font-mono font-bold text-white">{project.score}</span>
        <span className="text-sm text-slate-400 mb-1">/100 AI Score</span>
      </div>

      <div className="h-24 -mx-6 -mb-2 mt-auto relative opacity-50 group-hover:opacity-80 transition-opacity">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={project.trend.map((val, i) => ({ val, i }))}>
            <defs>
              <linearGradient id={`gradient-${project.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={isHealthy ? "#10b981" : isCritical ? "#f43f5e" : "#f59e0b"}
                  stopOpacity={0.3}
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

      <div className="flex gap-4 mt-6 pt-4 border-t border-slate-700">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Activity className="w-3 h-3" />
          {project.pagesScanned} Pages
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {isHealthy ? (
            <CheckCircle className="w-3 h-3 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-3 h-3 text-rose-500" />
          )}
          {project.issues} Issues
        </div>
      </div>
    </div>
  )
}
