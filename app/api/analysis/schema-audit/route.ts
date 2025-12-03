import { NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { url, html, existingSchemas } = await request.json()

    if (!html) {
      return NextResponse.json({ error: "HTML content is required" }, { status: 400 })
    }

    // Extract all JSON-LD scripts from HTML
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
    const schemas: any[] = []

    for (const match of jsonLdMatches) {
      const content = match.replace(/<script[^>]*>|<\/script>/gi, "")
      try {
        const parsed = JSON.parse(content)
        schemas.push(parsed)
      } catch {
        // Invalid JSON-LD
      }
    }

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Audit the following structured data (JSON-LD schemas) found on a webpage.

URL: ${url || "Unknown"}

Schemas found:
${JSON.stringify(schemas, null, 2)}

Analyze:
1. Completeness of each schema (required vs optional properties)
2. Correctness of property values
3. Schema.org compliance
4. Missing recommended schemas for this type of page
5. Opportunities to enhance existing schemas

Return a JSON object:
{
  "schemasFound": [
    {
      "type": "Organization|Product|FAQPage|Article|etc",
      "completeness": 75,
      "missingRequired": ["property1"],
      "missingRecommended": ["property2", "property3"],
      "issues": ["specific issues found"],
      "valid": true
    }
  ],
  "missingSchemas": [
    {
      "type": "BreadcrumbList",
      "reason": "Page has navigation breadcrumbs but no schema",
      "impact": "medium"
    }
  ],
  "overallScore": 65,
  "recommendations": [
    "Add missing 'logo' property to Organization schema",
    "Consider adding FAQPage schema for the FAQ section"
  ],
  "googleRichResultsEligible": ["FAQ", "Organization"],
  "summary": "brief audit summary"
}

Return only valid JSON.`,
    })

    try {
      const result = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim())
      return NextResponse.json({ success: true, rawSchemas: schemas, ...result })
    } catch {
      return NextResponse.json({
        success: true,
        rawSchemas: schemas,
        schemasFound: [],
        missingSchemas: [],
        overallScore: schemas.length > 0 ? 50 : 0,
        recommendations: [],
        googleRichResultsEligible: [],
        summary: "Unable to perform detailed schema audit",
      })
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Schema audit failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
