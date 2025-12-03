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
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AIReadinessBot/1.0)" },
      })
      html = await res.text()
    } catch (e) {
      return NextResponse.json({ nap: { name: null, address: null, phone: null } })
    }

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Extract Name (business name), Address, and Phone from this HTML.
Return JSON: {"name": "...", "address": "...", "phone": "..."}
Use null for missing fields.

HTML (first 8000 chars):
${html.slice(0, 8000)}

Return ONLY valid JSON.`,
    })

    let nap = { name: null, address: null, phone: null }
    try {
      nap = JSON.parse(text)
    } catch {}

    return NextResponse.json({ nap })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
