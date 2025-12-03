import { NextResponse } from "next/server"
import { generateText } from "ai"

function validateUrl(url: string): string {
  if (!url) throw new Error("URL is required")
  let cleanUrl = url.trim()
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = `https://${cleanUrl}`
  }
  new URL(cleanUrl)
  return cleanUrl
}

export async function POST(request: Request) {
  try {
    const { url: rawUrl, schema_type = "Organization" } = await request.json()
    const url = validateUrl(rawUrl)

    let html = ""
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AIReadinessBot/1.0)" },
      })
      html = await res.text()
    } catch {}

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Generate valid Schema.org JSON-LD for type "${schema_type}" based on this webpage.
Extract real values from the content.

HTML (first 10000 chars):
${html.slice(0, 10000)}

Return ONLY valid JSON-LD (no script tags, no backticks).`,
    })

    let jsonld = text.trim()
    // Clean up if wrapped in code blocks
    jsonld = jsonld.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "")

    return NextResponse.json({ jsonld })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
