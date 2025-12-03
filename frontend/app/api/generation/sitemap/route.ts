import { NextResponse } from "next/server"

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
    const domain = new URL(url).origin

    let html = ""
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AIReadinessBot/1.0)" },
      })
      html = await res.text()
    } catch {}

    // Extract links from HTML
    const linkMatches = html.match(/href=["']([^"']+)["']/gi) || []
    const links = linkMatches
      .map((m) => m.replace(/href=["']/i, "").replace(/["']$/, ""))
      .filter((l) => l.startsWith("/") || l.startsWith(domain))
      .map((l) => (l.startsWith("/") ? `${domain}${l}` : l))
      .filter((l, i, arr) => arr.indexOf(l) === i)
      .slice(0, 50)

    const today = new Date().toISOString().split("T")[0]

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
${links
  .map(
    (link) => `  <url>
    <loc>${link}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`

    return NextResponse.json({ sitemap })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
