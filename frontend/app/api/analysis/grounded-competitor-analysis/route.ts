import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain, topic } = body

    if (!domain) {
      return NextResponse.json({ error: "Domain required" }, { status: 400 })
    }

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Analyze the competitive landscape for ${domain}${topic ? ` in the ${topic} space` : ""}.

Provide:
1. A summary of the competitive position
2. Key search queries used for analysis
3. Sources/references

Return JSON:
{
  "summary": "Analysis summary...",
  "search_queries": ["query1", "query2"],
  "sources": [{ "title": "Source title", "url": "https://..." }]
}`,
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return NextResponse.json(JSON.parse(jsonMatch[0]))
    }

    return NextResponse.json({
      summary: "Unable to complete analysis",
      search_queries: [],
      sources: [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
