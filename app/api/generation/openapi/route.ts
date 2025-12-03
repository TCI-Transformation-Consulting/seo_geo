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
    const { url: rawUrl } = await request.json()
    const url = validateUrl(rawUrl)

    let html = ""
    let title = ""
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AIReadinessBot/1.0)" },
      })
      html = await res.text()
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname
    } catch {
      title = new URL(url).hostname
    }

    const domain = new URL(url).origin

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Based on this webpage, generate an OpenAPI 3.0 spec for a content API.
Include endpoints for: /api/content, /api/search, /api/info
Use the actual content to inform descriptions and schemas.

Website: ${url}
Title: ${title}

HTML (first 8000 chars):
${html.slice(0, 8000)}

Return ONLY valid YAML OpenAPI spec.`,
    })

    return NextResponse.json({ openapi: text })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
