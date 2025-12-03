import React from 'react';
import { Server, FileText, Lock, Plus } from 'lucide-react';

export const McpBridgeView: React.FC = () => {
  return (
    <div className="p-8 animate-fade-in">
        <header className="mb-10">
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
             <Server className="w-8 h-8 text-neuro-accent" />
             The Bridge (MCP)
          </h2>
          <p className="text-slate-400 max-w-2xl">
            Securely connect unstructured internal data (PDFs, Intranets) to AI Agents without leaking data. 
            Creates a localized Model Context Protocol server.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-8">
            {/* Active Bridges */}
            <div className="col-span-2 space-y-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Active Bridges</h3>
                
                <div className="bg-neuro-800 rounded-xl border border-neuro-700 p-6 flex items-start gap-4">
                    <div className="p-3 bg-neuro-500/20 rounded-lg text-neuro-400">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <h4 className="text-white font-bold text-lg">HR Policy Knowledge Base</h4>
                            <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded font-mono">ONLINE</span>
                        </div>
                        <p className="text-slate-400 text-sm mt-1">Parses 14 PDFs and Employee Handbook. Accessible via internal Claude Desktop.</p>
                        <div className="mt-4 flex items-center gap-3 bg-neuro-900 p-3 rounded border border-neuro-700/50">
                            <span className="text-xs text-slate-500 font-mono">ENDPOINT:</span>
                            <code className="text-xs text-neuro-accent font-mono">mcp://bridge.neuewerte.internal/hr-v2</code>
                        </div>
                    </div>
                </div>

                <div className="bg-neuro-800 rounded-xl border border-neuro-700 p-6 flex items-start gap-4">
                    <div className="p-3 bg-neuro-500/20 rounded-lg text-neuro-400">
                        <Lock className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <h4 className="text-white font-bold text-lg">Financial Reports Q3</h4>
                            <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded font-mono">ONLINE</span>
                        </div>
                        <p className="text-slate-400 text-sm mt-1">Vectorized Excel exports. Restricted access (Finance Dept only).</p>
                        <div className="mt-4 flex items-center gap-3 bg-neuro-900 p-3 rounded border border-neuro-700/50">
                            <span className="text-xs text-slate-500 font-mono">ENDPOINT:</span>
                            <code className="text-xs text-neuro-accent font-mono">mcp://bridge.neuewerte.internal/fin-q3</code>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create New */}
            <div className="col-span-1">
                <div className="bg-neuro-800/50 border-2 border-dashed border-neuro-700 rounded-xl p-8 flex flex-col items-center text-center h-full justify-center hover:bg-neuro-800 transition-colors cursor-pointer group">
                    <div className="w-16 h-16 rounded-full bg-neuro-700 flex items-center justify-center mb-6 group-hover:bg-neuro-500 transition-colors">
                        <Plus className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-white font-bold mb-2">Build New Bridge</h3>
                    <p className="text-slate-400 text-sm">Upload PDF, CSV or Docx. We create the Vector Store and API.</p>
                </div>
            </div>
        </div>
    </div>
  );
};
