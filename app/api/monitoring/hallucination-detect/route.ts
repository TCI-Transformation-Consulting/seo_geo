import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { generated_text, brand_url } = body

    if (!generated_text || !brand_url) {
      return NextResponse.json({ error: "Generated text and brand URL required" }, { status: 400 })
    }

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Analyze the following AI-generated text for potential hallucinations or inaccuracies about the brand at ${brand_url}.

Generated text:
"${generated_text}"

Identify any statements that:
- May be factually incorrect
- Contradict known information about the brand
- Make claims that cannot be verified

Return JSON:
{
  "findings": [
    {
      "statement": "The problematic statement",
      "contradiction": "What it contradicts or why it's suspicious",
      "citation": "Source if available",
      "confidence": 0.8
    }
  ]
}

If no issues found, return: { "findings": [] }`,
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return NextResponse.json(JSON.parse(jsonMatch[0]))
    }

    return NextResponse.json({ findings: [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
