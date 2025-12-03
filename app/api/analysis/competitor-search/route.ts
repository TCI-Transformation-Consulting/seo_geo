import { NextResponse } from "next/server"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyAFtMIEg-mEyZPr_NvWXv5VJVVNrV_Q3ys"

export async function POST(request: Request) {
  try {
    const { domain, topic, maxResults = 5 } = await request.json()

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 })
    }

    console.log("[v0] Searching competitors for:", domain, "topic:", topic)

    // Use Gemini with Google Search grounding
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

    const prompt = `Du bist ein Markt- und Wettbewerbsanalyst. Suche nach den wichtigsten Wettbewerbern für diese Website.

Domain: ${domain}
Branche/Thema: ${topic || "Allgemein"}

Finde die ${maxResults} wichtigsten direkten Wettbewerber, die ähnliche Produkte oder Dienstleistungen anbieten.

Antworte NUR mit folgendem JSON-Format:
{
  "competitors": [
    {
      "name": "Firmenname",
      "url": "https://...",
      "description": "Kurze Beschreibung was sie anbieten",
      "relevance": "Warum sie ein Wettbewerber sind",
      "strengths": ["Stärke 1", "Stärke 2"],
      "aiReadinessEstimate": <0-100>
    }
  ],
  "marketInsights": "Kurze Marktanalyse",
  "recommendedActions": ["Empfehlung 1", "Empfehlung 2"]
}`

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
        // Enable Google Search grounding
        tools: [{ googleSearch: {} }],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.log("[v0] Gemini competitor search error:", error)
      throw new Error(`Gemini error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"

    // Extract grounding metadata (citations)
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata
    const citations: Array<{ title: string; url: string }> = []

    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web) {
          citations.push({
            title: chunk.web.title || "",
            url: chunk.web.uri || "",
          })
        }
      }
    }

    const searchQueries = groundingMetadata?.webSearchQueries || []

    let result
    try {
      result = JSON.parse(text)
    } catch {
      result = { competitors: [], marketInsights: "", recommendedActions: [] }
    }

    console.log("[v0] Found", result.competitors?.length || 0, "competitors")

    return NextResponse.json({
      ...result,
      citations,
      searchQueries,
    })
  } catch (error: any) {
    console.log("[v0] Competitor search error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
