import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { my_url, competitors, top_n = 10 } = body

    if (!my_url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 })
    }

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Analyze semantic coverage gaps between a website and its competitors.

My URL: ${my_url}
Competitors: ${competitors?.join(", ") || "general industry competitors"}

Identify the top ${top_n} content gaps - topics that competitors cover but the main site doesn't.

Return JSON:
{
  "gaps": [
    {
      "topic": "Topic name",
      "suggested_h2": "Suggested heading",
      "suggested_paragraph": "Brief content suggestion",
      "references": [{ "competitor": "competitor.com", "page": "/page" }]
    }
  ]
}`,
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return NextResponse.json(JSON.parse(jsonMatch[0]))
    }

    return NextResponse.json({ gaps: [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
