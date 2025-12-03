"use client"

import dynamic from "next/dynamic"

// Dynamically import App with SSR disabled to prevent hydration mismatch
const App = dynamic(() => import("../App"), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-slate-400">Loading...</div>
    </div>
  )
})

export default function Page() {
  return <App />
}
