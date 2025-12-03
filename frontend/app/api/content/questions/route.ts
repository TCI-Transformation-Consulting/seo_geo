import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, urls, max_items = 50 } = body

    const targetUrls = urls?.length ? urls : url ? [url] : []
    if (!targetUrls.length) {
      return NextResponse.json({ error: "URL required" }, { status: 400 })
    }

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Analyze these URLs and generate ${max_items} questions that users might ask about the content.
      
URLs: ${targetUrls.join(", ")}

Generate questions in JSON format:
{
  "items": [
    { "question": "...", "cluster": "category" }
  ]
}

Focus on:
- Common user queries
- FAQ-style questions
- Questions about products/services
- How-to questions
- Comparison questions`,
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return NextResponse.json(JSON.parse(jsonMatch[0]))
    }

    return NextResponse.json({
      items: [
        { question: "What services do you offer?", cluster: "general" },
        { question: "How can I contact you?", cluster: "contact" },
      ],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
