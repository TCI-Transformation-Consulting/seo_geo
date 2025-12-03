import { NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { url, content, title } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Use Claude with search grounding capability for fact checking
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Analyze the following webpage content for factual claims and assess their verifiability.

URL: ${url || "Unknown"}
Title: ${title || "Unknown"}

Content:
${content.substring(0, 8000)}

Identify factual claims made on this page and assess:
1. Statistics and numbers cited
2. Claims about company/product capabilities
3. Historical facts mentioned
4. Comparisons or superlatives ("best", "fastest", "only")
5. Testimonials or case study claims

Return a JSON object:
{
  "claims": [
    {
      "claim": "the specific claim made",
      "type": "statistic|capability|historical|comparison|testimonial",
      "verifiable": true,
      "confidence": 0.8,
      "issue": "potential issue if any, or null",
      "recommendation": "how to improve credibility"
    }
  ],
  "overallCredibility": 75,
  "citationsMissing": true,
  "sourcesNeeded": ["list of claims that need citations"],
  "superlativesUsed": ["best", "leading"],
  "recommendations": [
    "Add source citations for statistics",
    "Link to case studies for claims"
  ],
  "summary": "brief credibility assessment"
}

Return only valid JSON.`,
    })

    try {
      const result = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim())
      return NextResponse.json({ success: true, ...result })
    } catch {
      return NextResponse.json({
        success: true,
        claims: [],
        overallCredibility: 50,
        citationsMissing: false,
        sourcesNeeded: [],
        superlativesUsed: [],
        recommendations: [],
        summary: "Unable to analyze factual claims",
      })
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Fact check failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
