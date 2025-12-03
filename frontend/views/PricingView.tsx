"use client"

import type React from "react"
import { PRICING_TIERS } from "../constants"
import { Check } from "lucide-react"

export const PricingView: React.FC = () => {
  return (
    <div className="p-8 animate-fade-in">
      <header className="text-center max-w-3xl mx-auto mb-16 pt-10">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
          Invest in your <br />
          Digital Infrastructure
        </h2>
        <p className="text-slate-400 text-lg">
          Choose the right plan to make your content visible, accessible, and understandable for the next generation of
          AI Agents.
        </p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`relative rounded-2xl p-8 border flex flex-col ${
              tier.highlight
                ? "bg-slate-800 border-indigo-500 shadow-2xl shadow-indigo-500/10 scale-105 z-10"
                : "bg-slate-900 border-slate-800 hover:border-slate-700"
            }`}
          >
            {tier.highlight && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Most Popular
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-white">{tier.price}</span>
                {tier.price !== "Free" && <span className="text-slate-500">/month</span>}
              </div>
              <p className="text-slate-400 text-sm h-10">{tier.description}</p>
            </div>

            <div className="flex-1 space-y-4 mb-8">
              {tier.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`p-0.5 rounded-full ${tier.highlight ? "bg-indigo-500" : "bg-slate-800"} text-white`}>
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-sm text-slate-300">{feature}</span>
                </div>
              ))}
            </div>

            <button
              className={`w-full py-3 rounded-xl font-bold transition-colors ${
                tier.highlight
                  ? "bg-indigo-500 hover:bg-indigo-400 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              }`}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-20 max-w-4xl mx-auto bg-slate-800/30 border border-slate-700 rounded-2xl p-8 text-center">
        <h4 className="text-white font-bold mb-2">Need a custom enterprise audit?</h4>
        <p className="text-slate-400 text-sm mb-6">
          For Fortune 500 companies requiring On-Premise MCP installation and custom security protocols.
        </p>
        <button className="text-indigo-400 hover:text-white font-medium underline">Contact Enterprise Sales</button>
      </div>
    </div>
  )
}
