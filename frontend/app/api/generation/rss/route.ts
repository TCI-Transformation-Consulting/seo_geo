import { NextResponse } from "next/server"
import { generateText } from "ai"

function validateUrl(url: string): string {
  if (!url) throw new Error("URL is required")
  let cleanUrl = url.trim()
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = `https://${cleanUrl}`
  }
  new URL(cleanUrl) // This will throw if invalid
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

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Extract content items from this webpage to create RSS feed items.
Return JSON array with objects: {title, description, link, pubDate}

HTML (first 10000 chars):
${html.slice(0, 10000)}

Return ONLY valid JSON array.`,
    })

    let items: any[] = []
    try {
      items = JSON.parse(text)
    } catch {
      items = [{ title, description: "Main page content", link: url, pubDate: new Date().toUTCString() }]
    }

    const domain = new URL(url).origin
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:ai="http://ai-readiness.org/rss">
  <channel>
    <title>${title}</title>
    <link>${url}</link>
    <description>AI-optimized RSS feed for ${title}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${domain}/feed.xml" rel="self" type="application/rss+xml"/>
${items
  .slice(0, 20)
  .map(
    (item) => `    <item>
      <title>${item.title || "Untitled"}</title>
      <description><![CDATA[${item.description || ""}]]></description>
      <link>${item.link || url}</link>
      <pubDate>${item.pubDate || new Date().toUTCString()}</pubDate>
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>`

    return NextResponse.json({ rss })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
