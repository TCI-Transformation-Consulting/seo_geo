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
    const { url: rawUrl, max_chunks = 10 } = await request.json()
    const url = validateUrl(rawUrl)

    // Fetch webpage
    let html = ""
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AIReadinessBot/1.0)" },
      })
      html = await res.text()
    } catch (e) {
      return NextResponse.json({ url, chunks: [] })
    }

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Extract the main content from this HTML and create ${max_chunks} Q&A chunks.
Each chunk should have a "question" (H2 style headline as a question) and "answer" (direct answer, max 50 words).

HTML (first 10000 chars):
${html.slice(0, 10000)}

Return ONLY a JSON array of objects with "question" and "answer" fields.`,
    })

    let chunks = []
    try {
      chunks = JSON.parse(text)
    } catch {
      chunks = []
    }

    return NextResponse.json({ url, chunks })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
