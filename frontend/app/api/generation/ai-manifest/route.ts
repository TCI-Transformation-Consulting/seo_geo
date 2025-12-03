import { NextResponse } from "next/server"

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
    let description = ""
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AIReadinessBot/1.0)" },
      })
      html = await res.text()
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
      description = descMatch ? descMatch[1] : ""
    } catch {
      title = new URL(url).hostname
    }

    const domain = new URL(url).origin

    const manifest = JSON.stringify(
      {
        $schema: "https://ai-manifest.org/schema/v1.json",
        version: "1.0",
        name: title,
        description: description || `AI manifest for ${title}`,
        url: url,
        contact: {
          email: `ai-contact@${new URL(url).hostname}`,
        },
        ai_policy: {
          allows_training: false,
          allows_inference: true,
          allows_indexing: true,
          attribution_required: true,
        },
        content: {
          primary_language: "en",
          content_types: ["text/html", "application/json"],
          update_frequency: "weekly",
        },
        capabilities: {
          structured_data: true,
          api_available: true,
          mcp_server: true,
          rss_feed: true,
        },
        endpoints: {
          sitemap: `${domain}/sitemap.xml`,
          robots: `${domain}/robots.txt`,
          rss: `${domain}/feed.xml`,
          api: `${domain}/api`,
          mcp: `${domain}/.well-known/mcp.json`,
        },
      },
      null,
      2,
    )

    return NextResponse.json({ manifest })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
