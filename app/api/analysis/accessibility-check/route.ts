import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { url, html } = await request.json()

    if (!html) {
      return NextResponse.json({ error: "HTML content is required" }, { status: 400 })
    }

    const issues: any[] = []
    const passes: string[] = []

    // Check for images without alt text
    const imgMatches = html.match(/<img[^>]*>/gi) || []
    let imagesWithoutAlt = 0
    const totalImages = imgMatches.length

    for (const img of imgMatches) {
      if (!img.includes("alt=") || img.match(/alt=["']\s*["']/)) {
        imagesWithoutAlt++
      }
    }

    if (imagesWithoutAlt > 0) {
      issues.push({
        type: "images_missing_alt",
        severity: "high",
        count: imagesWithoutAlt,
        message: `${imagesWithoutAlt} of ${totalImages} images missing alt text`,
        impact: "AI systems cannot understand image content without alt text",
      })
    } else if (totalImages > 0) {
      passes.push(`All ${totalImages} images have alt text`)
    }

    // Check for heading hierarchy
    const h1Matches = html.match(/<h1[^>]*>/gi) || []
    const h2Matches = html.match(/<h2[^>]*>/gi) || []
    const h3Matches = html.match(/<h3[^>]*>/gi) || []

    if (h1Matches.length === 0) {
      issues.push({
        type: "missing_h1",
        severity: "high",
        message: "Page is missing an H1 heading",
        impact: "AI systems use H1 to understand the main topic",
      })
    } else if (h1Matches.length > 1) {
      issues.push({
        type: "multiple_h1",
        severity: "medium",
        count: h1Matches.length,
        message: `Page has ${h1Matches.length} H1 headings (should have exactly 1)`,
        impact: "Multiple H1s can confuse AI about the main topic",
      })
    } else {
      passes.push("Page has exactly one H1 heading")
    }

    if (h2Matches.length > 0) {
      passes.push(`Page has ${h2Matches.length} H2 section headings`)
    }

    // Check for semantic HTML
    const hasMain = /<main[^>]*>/i.test(html)
    const hasNav = /<nav[^>]*>/i.test(html)
    const hasArticle = /<article[^>]*>/i.test(html)
    const hasHeader = /<header[^>]*>/i.test(html)
    const hasFooter = /<footer[^>]*>/i.test(html)

    const semanticElements = [
      { name: "main", present: hasMain },
      { name: "nav", present: hasNav },
      { name: "header", present: hasHeader },
      { name: "footer", present: hasFooter },
    ]

    const missingSemantic = semanticElements.filter((e) => !e.present).map((e) => e.name)

    if (missingSemantic.length > 0) {
      issues.push({
        type: "missing_semantic_html",
        severity: "medium",
        missing: missingSemantic,
        message: `Missing semantic elements: ${missingSemantic.join(", ")}`,
        impact: "Semantic HTML helps AI understand page structure",
      })
    } else {
      passes.push("Page uses semantic HTML elements (main, nav, header, footer)")
    }

    // Check for lang attribute
    const hasLang = /<html[^>]*lang=["'][^"']+["']/i.test(html)
    if (!hasLang) {
      issues.push({
        type: "missing_lang",
        severity: "medium",
        message: "HTML element missing lang attribute",
        impact: "AI needs language info for proper content processing",
      })
    } else {
      passes.push("Page has language attribute set")
    }

    // Check for meta description
    const hasMetaDesc = /<meta[^>]*name=["']description["'][^>]*content=["'][^"']+["']/i.test(html)
    if (!hasMetaDesc) {
      issues.push({
        type: "missing_meta_description",
        severity: "high",
        message: "Page is missing meta description",
        impact: "Meta description is often used by AI for summarization",
      })
    } else {
      passes.push("Page has meta description")
    }

    // Check for links with text
    const linkMatches = html.match(/<a[^>]*>[\s\S]*?<\/a>/gi) || []
    let emptyLinks = 0

    for (const link of linkMatches) {
      const text = link.replace(/<[^>]*>/g, "").trim()
      if (!text && !link.includes("aria-label")) {
        emptyLinks++
      }
    }

    if (emptyLinks > 0) {
      issues.push({
        type: "empty_links",
        severity: "medium",
        count: emptyLinks,
        message: `${emptyLinks} links have no accessible text`,
        impact: "AI cannot understand the purpose of links without text",
      })
    }

    // Calculate score
    const highIssues = issues.filter((i) => i.severity === "high").length
    const mediumIssues = issues.filter((i) => i.severity === "medium").length
    const lowIssues = issues.filter((i) => i.severity === "low").length

    const score = Math.max(0, 100 - highIssues * 20 - mediumIssues * 10 - lowIssues * 5)

    return NextResponse.json({
      success: true,
      url,
      score,
      issues,
      passes,
      summary: {
        totalIssues: issues.length,
        highSeverity: highIssues,
        mediumSeverity: mediumIssues,
        lowSeverity: lowIssues,
        totalImages,
        imagesWithAlt: totalImages - imagesWithoutAlt,
        headingStructure: {
          h1: h1Matches.length,
          h2: h2Matches.length,
          h3: h3Matches.length,
        },
        semanticHtml: {
          main: hasMain,
          nav: hasNav,
          article: hasArticle,
          header: hasHeader,
          footer: hasFooter,
        },
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: `Accessibility check failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
