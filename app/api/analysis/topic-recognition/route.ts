import { NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { url, content, title } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Analyze the following webpage content and identify the main topics and themes.

URL: ${url || "Unknown"}
Title: ${title || "Unknown"}

Content:
${content.substring(0, 8000)}

Return a JSON object with:
{
  "primaryTopic": "main topic of the page",
  "secondaryTopics": ["list", "of", "secondary", "topics"],
  "industry": "detected industry/niche",
  "contentType": "blog|product|service|landing|about|contact|faq|other",
  "keywords": ["important", "keywords", "found"],
  "entities": [
    {"name": "entity name", "type": "person|organization|product|location|concept"}
  ],
  "sentiment": "positive|neutral|negative",
  "targetAudience": "description of target audience",
  "confidence": 0.85
}

Return only valid JSON.`,
    })

    try {
      const result = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim())
      return NextResponse.json({ success: true, ...result })
    } catch {
      return NextResponse.json({
        success: true,
        primaryTopic: "General",
        secondaryTopics: [],
        industry: "Unknown",
        contentType: "other",
        keywords: [],
        entities: [],
        sentiment: "neutral",
        targetAudience: "General audience",
        confidence: 0.5,
      })
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Topic recognition failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
