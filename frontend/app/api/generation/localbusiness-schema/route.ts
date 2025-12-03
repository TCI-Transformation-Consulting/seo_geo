import { NextResponse } from "next/server"
import { generateText } from "ai"

function validateUrl(url: string): string {
  if (!url) return "https://example.com"
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`
  }
  return url
}

export async function POST(request: Request) {
  try {
    const { url, content, napData } = await request.json()
    const validUrl = validateUrl(url)

    const napContext = napData
      ? `
NAP Data found:
- Business Name: ${napData.name || "Unknown"}
- Address: ${napData.address || "Unknown"}
- Phone: ${napData.phone || "Unknown"}
- Hours: ${napData.hours || "Unknown"}
`
      : ""

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      prompt: `Generate a comprehensive LocalBusiness JSON-LD schema for this website.

URL: ${validUrl}
${napContext}
Content:
${(content || "").substring(0, 4000)}

Create a complete LocalBusiness schema with:
- @type (use specific subtype if applicable: Restaurant, Store, MedicalBusiness, etc.)
- name
- description
- url
- telephone
- email (if found)
- address (PostalAddress)
- geo (GeoCoordinates if possible)
- openingHoursSpecification
- priceRange (if applicable)
- image
- sameAs (social profiles)
- aggregateRating (if reviews found)

Return ONLY the JSON-LD object, no markdown or explanation.`,
    })

    let schema
    try {
      schema = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim())
    } catch {
      schema = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: napData?.name || "Business Name",
        url: validUrl,
        telephone: napData?.phone || "",
        address: {
          "@type": "PostalAddress",
          streetAddress: napData?.address || "",
        },
      }
    }

    // Ensure required context
    if (!schema["@context"]) {
      schema["@context"] = "https://schema.org"
    }

    return NextResponse.json({
      success: true,
      localbusiness: JSON.stringify(schema, null, 2),
      filename: "localbusiness-schema.json",
    })
  } catch (error) {
    return NextResponse.json(
      { error: `LocalBusiness schema generation failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
