import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { goal, urls = [], constraints } = body

    if (!goal) {
      return NextResponse.json({ error: "Goal required" }, { status: 400 })
    }

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `You are an AI agent that plans and executes tasks to achieve a goal.

Goal: ${goal}
URLs to analyze: ${urls.join(", ") || "None provided"}
Constraints: ${JSON.stringify(constraints || {})}

Plan the steps needed to achieve this goal and provide a summary.

Return JSON:
{
  "steps": [
    {
      "tool": "tool_name",
      "args": { "arg1": "value1" },
      "output_summary": "What this step accomplished"
    }
  ],
  "summary": "Overall summary of what was accomplished"
}`,
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return NextResponse.json(JSON.parse(jsonMatch[0]))
    }

    return NextResponse.json({
      steps: [],
      summary: "Unable to complete the task",
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
