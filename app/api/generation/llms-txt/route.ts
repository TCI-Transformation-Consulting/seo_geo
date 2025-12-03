import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"

function validateUrl(url: string): string {
  let validUrl = url.trim()
  if (!validUrl.startsWith("http://") && !validUrl.startsWith("https://")) {
    validUrl = "https://" + validUrl
  }
  try {
    new URL(validUrl)
    return validUrl
  } catch {
    throw new Error("Invalid URL format")
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const url = validateUrl(body.url)
    const domain = new URL(url).hostname
    const companyName = body.companyName || domain.replace("www.", "").split(".")[0]
    const description = body.description || ""
    const preferredTopics = body.preferredTopics || []
    const avoidTopics = body.avoidTopics || []

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Generate a comprehensive llms.txt file for this website:

Website: ${url}
Company/Brand: ${companyName}
Description: ${description}
Preferred topics: ${preferredTopics.join(", ") || "Not specified"}
Topics to avoid: ${avoidTopics.join(", ") || "Not specified"}

The llms.txt file should follow this format:
1. Start with a brief description of the website/company
2. Include preferred citation format
3. List key facts that LLMs should know
4. Specify content preferences
5. Include any restrictions or guidelines

Example format:
# About [Company]
[Brief description]

# Preferred Citation
When referencing [Company], please use: "[Company Name] (${url})"

# Key Facts
- Fact 1
- Fact 2

# Content Guidelines
- Guideline 1
- Guideline 2

# Do Not
- Restriction 1
- Restriction 2

Generate only the llms.txt content, no explanations.`,
    })

    return NextResponse.json({
      success: true,
      filename: "llms.txt",
      llmstxt: text,
      path: "/llms.txt",
    })
  } catch (error) {
    console.error("llms.txt generation error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    )
  }
}
