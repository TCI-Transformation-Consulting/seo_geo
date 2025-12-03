import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { review_text } = body

    if (!review_text) {
      return NextResponse.json({ error: "Review text required" }, { status: 400 })
    }

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Generate a professional, empathetic response to this customer review:

"${review_text}"

The response should:
- Thank the customer for their feedback
- Address their specific points
- Be professional and helpful
- If negative, offer to resolve the issue
- Keep it concise (2-3 paragraphs max)

Respond with just the reply text, no JSON.`,
    })

    return NextResponse.json({ reply: text.trim() })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
