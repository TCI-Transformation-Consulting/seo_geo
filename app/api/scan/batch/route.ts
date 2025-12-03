import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, max_pages = 10 } = body

    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 })
    }

    // Parse domain
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`)
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
    }

    // Simulate batch scan results
    const samplePages = [
      { path: "/", title: "Home" },
      { path: "/about", title: "About" },
      { path: "/services", title: "Services" },
      { path: "/contact", title: "Contact" },
      { path: "/blog", title: "Blog" },
    ].slice(0, max_pages)

    return NextResponse.json({
      root: parsedUrl.origin,
      total_discovered: Math.min(max_pages * 2, 50),
      processed: samplePages.length,
      chunks_ok: samplePages.length,
      nap_ok: 1,
      errors_count: 0,
      sample: samplePages.map((p) => ({
        url: `${parsedUrl.origin}${p.path}`,
        chunks_preview: [{ question: `What is ${p.title}?`, answer: `Information about ${p.title}` }],
        nap: p.path === "/" ? { name: parsedUrl.hostname, address: null, phone: null } : null,
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
