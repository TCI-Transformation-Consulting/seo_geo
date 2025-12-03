import { NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { url, content, title, industry, competitors } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    const competitorContext = competitors?.length ? `\nKnown competitors: ${competitors.join(", ")}` : ""

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Analyze the following webpage content and identify content gaps and missing opportunities for AI discoverability.

URL: ${url || "Unknown"}
Title: ${title || "Unknown"}
Industry: ${industry || "Unknown"}${competitorContext}

Content:
${content.substring(0, 8000)}

Identify:
1. Missing content that would improve AI understanding
2. Topics competitors likely cover that this page doesn't
3. Questions users might ask that aren't answered
4. Missing structured data opportunities
5. Content depth issues

Return a JSON object:
{
  "gaps": [
    {
      "type": "missing_content|missing_schema|missing_faq|thin_content|missing_topic",
      "title": "short title",
      "description": "what's missing",
      "impact": "high|medium|low",
      "recommendation": "specific action to take",
      "estimatedEffort": "low|medium|high"
    }
  ],
  "missingQuestions": ["questions users might ask that aren't answered"],
  "missingTopics": ["topics that should be covered"],
  "schemaOpportunities": ["Product", "FAQ", "HowTo", "Review"],
  "contentScore": 65,
  "summary": "brief summary of content gaps"
}

Return only valid JSON.`,
    })

    try {
      const result = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim())
      return NextResponse.json({ success: true, ...result })
    } catch {
      return NextResponse.json({
        success: true,
        gaps: [],
        missingQuestions: [],
        missingTopics: [],
        schemaOpportunities: [],
        contentScore: 50,
        summary: "Unable to analyze content gaps",
      })
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Content gap analysis failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
