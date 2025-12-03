"use client"

import { useState } from "react"
import { Sidebar } from "./components/Sidebar"
import { DashboardView } from "./views/DashboardView"
import { ProjectDetailView } from "./views/ProjectDetailView"
import { LandingView } from "./views/LandingView"
import { PricingView } from "./views/PricingView"
import LoginView from "./views/LoginView"
import type { ViewState, ClientProject } from "./types"
import { MOCK_PROJECTS } from "./constants"

function App() {
  const [currentView, setCurrentView] = useState<ViewState>("landing")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [adHocProject, setAdHocProject] = useState<ClientProject | null>(null)

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view)
    if (view === "dashboard") {
      setSelectedProjectId(null)
      setAdHocProject(null)
    }
  }

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id)
    setCurrentView("project_detail")
  }

  const handleScanComplete = (project: ClientProject) => {
    setAdHocProject(project)
    setCurrentView("project_detail")
  }

  const getSelectedProject = (): ClientProject => {
    if (adHocProject) return adHocProject
    const base: any = MOCK_PROJECTS.find((p) => p.id === selectedProjectId) || MOCK_PROJECTS[0]
    // Coerce demo project to full ClientProject shape
    return {
      id: base.id,
      name: base.name,
      domain: base.domain,
      url: base.url || `https://${base.domain}`,
      score: base.score ?? 0,
      lastScan: base.lastScan || new Date().toISOString(),
      pagesScanned: base.pagesScanned ?? 0,
      clusters: base.clusters ?? 0,
      issues: base.issues ?? 0,
      status: base.status || "healthy",
      trend: base.trend || [],
      auditScores: base.auditScores || {},
      selectedPackage: base.selectedPackage || "quick_check",
      analyses: base.analyses || [],
      generatedFiles: base.generatedFiles || [],
      htmlSnippet: base.htmlSnippet,
      markdown: base.markdown,
      initialScan: base.initialScan,
    }
  }

  const renderContent = () => {
    switch (currentView) {
      case "landing":
        return <LandingView onNavigate={handleNavigate} onScanComplete={handleScanComplete} />
      case "pricing":
        return <PricingView />
      case "dashboard":
        return <DashboardView onSelectProject={handleSelectProject} />
      case "project_detail":
        return (
          <ProjectDetailView
            project={getSelectedProject()}
            onBack={() => handleNavigate("dashboard")}
          />
        )
      default:
        return <LandingView onNavigate={handleNavigate} onScanComplete={handleScanComplete} />
    }
  }

  const isAuthed = (() => {
    try {
      return !!localStorage.getItem("auth_token")
    } catch {
      return false
    }
  })()

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-50 font-sans">
        <LoginView onNavigate={handleNavigate} />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-50 font-sans">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} />

      <main className="flex-1 ml-64 relative overflow-auto">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-slate-900 z-50"></div>
        {renderContent()}
      </main>
    </div>
  )
}

export default App
