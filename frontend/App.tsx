"use client"

import { useState } from "react"
import { Sidebar } from "./components/Sidebar"
import { ProjectDetailView } from "./views/ProjectDetailView"
import { LandingView } from "./views/LandingView"
import { PricingView } from "./views/PricingView"
import LoginView from "./views/LoginView"
import type { ViewState, ClientProject } from "./types"

function App() {
  const [currentView, setCurrentView] = useState<ViewState>("landing")
  const [adHocProject, setAdHocProject] = useState<ClientProject | null>(null)

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view)
    if (view === "landing") {
      setAdHocProject(null)
    }
  }

  const handleScanComplete = (project: ClientProject) => {
    setAdHocProject(project)
    setCurrentView("project_detail")
  }

  const renderContent = () => {
    switch (currentView) {
      case "landing":
        return <LandingView onNavigate={handleNavigate} onScanComplete={handleScanComplete} />
      case "pricing":
        return <PricingView />
      case "project_detail":
        return adHocProject ? (
          <ProjectDetailView
            project={adHocProject}
            onBack={() => handleNavigate("landing")}
          />
        ) : (
          <LandingView onNavigate={handleNavigate} onScanComplete={handleScanComplete} />
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

      <main className="flex-1 relative overflow-auto" style={{ marginLeft: '18rem' }}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-slate-900 z-10"></div>
        {renderContent()}
      </main>
    </div>
  )
}

export default App
