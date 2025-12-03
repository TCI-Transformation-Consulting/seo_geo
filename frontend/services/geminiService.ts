import { GoogleGenAI, Type } from "@google/genai";
import { AgentPersona } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// 1. SIMULATION ENGINE
// Simulates how different AI personas perceive a piece of content.
export const simulateAgentPerception = async (
  content: string,
  persona: AgentPersona
) => {
  if (!process.env.API_KEY) {
    throw new Error("API Key missing");
  }

  let systemInstruction = "";
  
  switch (persona) {
    case AgentPersona.SHOPPER:
      systemInstruction = "You are a shopping assistant bot (like GPT-4o acting as a shopper). Your goal is to find hard facts about price, availability, and specific features to recommend products to a user. Be strict. If a price is missing, complain about it. If availability is vague, note it.";
      break;
    case AgentPersona.ANALYST:
      systemInstruction = "You are a technical analyst AI (like Claude 3.5). You look for technical specifications, data accuracy, source credibility, and structured data tables. You ignore marketing fluff.";
      break;
    case AgentPersona.SEARCHER:
      systemInstruction = "You are a search engine AI (like Perplexity). You are trying to determine trust, authority, and answer specific user queries. You flag ambiguity.";
      break;
  }

  const model = "gemini-2.5-flash"; // Fast model for interactive UI

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Analyze this HTML snippet/Content:\n\n${content}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            perception: { type: Type.STRING, description: "A summary of what you understood from the content." },
            missingData: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of specific data points that are missing or ambiguous." },
            score: { type: Type.INTEGER, description: "A score from 0-100 on how machine-readable this content is." }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Simulation Error:", error);
    throw error;
  }
};

// 2. OPTIMIZATION ENGINE
// Generates the "Neuro-Web" Fix (JSON-LD)
export const generateJsonLdFix = async (content: string, type: 'Product' | 'Service' | 'Article') => {
    if (!process.env.API_KEY) {
        throw new Error("API Key missing");
    }

    const model = "gemini-2.5-flash";

    try {
        const response = await ai.models.generateContent({
            model,
            contents: `Extract data from this HTML and generate valid Schema.org JSON-LD code for a ${type}. 
            Make reasonable assumptions for missing fields but mark them with a comment if possible.
            Ensure the output is ONLY the JSON-LD script tag content.
            
            HTML Content:
            ${content}`,
            config: {
                systemInstruction: "You are a senior SEO and Data Engineer. Your job is to translate human-readable HTML into machine-readable JSON-LD. Use strict typing.",
                responseMimeType: "text/plain", 
            }
        });
        
        return response.text;
    } catch (error) {
        console.error("Gemini Generation Error:", error);
        throw error;
    }
}

// 3. ARTIFACT FOUNDRY
// Generates specific AI Infrastructure files based on the Client Context
export const generateArtifact = async (promptTemplate: string, context?: string) => {
    if (!process.env.API_KEY) {
        throw new Error("API Key missing");
    }

    const model = "gemini-2.5-flash";
    
    // Construct the full prompt with context if available
    let fullPrompt = promptTemplate;
    if (context) {
        fullPrompt = `
        CONTEXT (The Client's Website Source Code):
        ${context.substring(0, 15000)} 
        
        TASK:
        ${promptTemplate}
        
        INSTRUCTION:
        Analyze the Context provided above. Generate the requested artifact specifically for this content. 
        For example, if asked for JSON-LD, extract the *actual* product names and prices from the Context.
        `;
    }

    try {
        const response = await ai.models.generateContent({
            model,
            contents: fullPrompt,
            config: {
                systemInstruction: "You are an expert infrastructure engineer for AI Agents. You generate high-quality, production-ready code snippets (XML, JSON, YAML, Python) based on requirements. Output ONLY the code, no markdown backticks or explanations.",
            }
        });
        
        return response.text;
    } catch (error) {
        console.error("Gemini Artifact Error:", error);
        throw error;
    }
}
