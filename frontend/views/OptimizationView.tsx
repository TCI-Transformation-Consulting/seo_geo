import React, { useState, useEffect } from 'react';
import { SAMPLE_HTML_CONTENT } from '../constants';
import { AgentPersona, SimulationResult } from '../types';
import { simulateAgentPerception, generateJsonLdFix } from '../services/geminiService';
import { Bot, Code2, Play, RefreshCw, AlertCircle, Check, Copy } from 'lucide-react';

interface SimulatorComponentProps {
    initialContent?: string;
}

export const SimulatorComponent: React.FC<SimulatorComponentProps> = ({ initialContent }) => {
  const [content, setContent] = useState(initialContent || SAMPLE_HTML_CONTENT);
  const [activePersona, setActivePersona] = useState<AgentPersona>(AgentPersona.SHOPPER);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Update local content if prop changes (e.g. from a real scan)
  useEffect(() => {
    if (initialContent) {
        setContent(initialContent);
    }
  }, [initialContent]);

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const result = await simulateAgentPerception(content, activePersona);
      setSimulationResult({
        persona: activePersona,
        ...result
      });
    } catch (e) {
      alert("Simulation failed. Check API Key.");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleGenerateFix = async () => {
    setIsGenerating(true);
    try {
      const result = await generateJsonLdFix(content, 'Product');
      setGeneratedCode(result || "Error generating code.");
    } catch (e) {
      alert("Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        
        {/* LEFT: SOURCE CODE EDITOR */}
        <div className="col-span-5 flex flex-col bg-neuro-800 rounded-xl border border-neuro-700 overflow-hidden">
            <div className="p-3 border-b border-neuro-700 bg-neuro-900/50 flex justify-between items-center">
                <span className="text-xs font-mono text-slate-400">INPUT: Source Code</span>
                <button 
                    onClick={() => setContent(initialContent || SAMPLE_HTML_CONTENT)}
                    className="text-xs text-neuro-400 hover:text-white flex items-center gap-1"
                >
                    <RefreshCw className="w-3 h-3" /> Reset
                </button>
            </div>
            <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 bg-neuro-900 p-4 font-mono text-xs text-slate-300 resize-none focus:outline-none focus:ring-1 focus:ring-neuro-500 custom-scrollbar"
                spellCheck={false}
            />
        </div>

        {/* CENTER: SIMULATION CONTROLS */}
        <div className="col-span-2 flex flex-col gap-4 pt-10">
            <div className="bg-neuro-800 p-4 rounded-xl border border-neuro-700">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3 block">Select Persona</label>
                <div className="space-y-2">
                    {[AgentPersona.SHOPPER, AgentPersona.ANALYST, AgentPersona.SEARCHER].map(p => (
                        <button
                            key={p}
                            onClick={() => setActivePersona(p)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                                activePersona === p 
                                ? 'bg-neuro-500 text-white border-neuro-400 shadow-lg shadow-neuro-500/20' 
                                : 'bg-neuro-900 text-slate-400 border-neuro-800 hover:border-neuro-600'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <button 
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="bg-white text-neuro-900 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
                {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Run Sim
            </button>

            <button 
                onClick={handleGenerateFix}
                disabled={isGenerating}
                className="bg-neuro-500 text-white font-bold py-3 rounded-xl hover:bg-neuro-400 transition-colors flex items-center justify-center gap-2 mt-auto"
            >
               {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Code2 className="w-4 h-4" />}
               Generate Fix
            </button>
        </div>

        {/* RIGHT: RESULTS */}
        <div className="col-span-5 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            
            {/* Simulation Output */}
            <div className="bg-neuro-800 rounded-xl border border-neuro-700 overflow-hidden min-h-[200px]">
                <div className="p-3 border-b border-neuro-700 bg-neuro-900/50 flex justify-between items-center">
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                        <Bot className="w-3 h-3" /> AI PERCEPTION
                    </span>
                    {simulationResult && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            simulationResult.score > 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                            Score: {simulationResult.score}/100
                        </span>
                    )}
                </div>
                <div className="p-4">
                    {!simulationResult ? (
                        <div className="text-center text-slate-600 mt-10 text-sm">Run simulation to see AI analysis</div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-xs text-neuro-400 mb-1">What the AI understood:</h4>
                                <p className="text-sm text-slate-300 italic">"{simulationResult.perception}"</p>
                            </div>
                            {simulationResult.missingData.length > 0 && (
                                <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
                                    <h4 className="text-xs text-rose-400 mb-2 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> BLIND SPOTS DETECTED
                                    </h4>
                                    <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                                        {simulationResult.missingData.map((m, i) => (
                                            <li key={i}>{m}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Code Output */}
            <div className="bg-neuro-800 rounded-xl border border-neuro-700 overflow-hidden flex-1 flex flex-col min-h-[200px]">
                <div className="p-3 border-b border-neuro-700 bg-neuro-900/50 flex justify-between items-center">
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                        <Code2 className="w-3 h-3" /> GENERATED PATCH (JSON-LD)
                    </span>
                    {generatedCode && (
                         <button className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                         <Copy className="w-3 h-3" /> Copy
                     </button>
                    )}
                </div>
                <div className="flex-1 bg-neuro-900 p-4 relative overflow-auto custom-scrollbar">
                     {!generatedCode ? (
                         <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">
                             No fix generated yet
                         </div>
                     ) : (
                         <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                             {generatedCode}
                         </pre>
                     )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

// Export for standalone view if needed, but primarily used as component now
export const OptimizationView = () => <div className="p-8 h-screen"><SimulatorComponent /></div>
