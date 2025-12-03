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
    const domain = new URL(url).hostname

    const config = JSON.stringify(
      {
        $schema: "https://modelcontextprotocol.io/schema/v1/server.json",
        name: `${domain}-mcp-server`,
        version: "1.0.0",
        description: `MCP Server for ${domain} - Provides content access for AI systems`,
        capabilities: {
          resources: true,
          tools: true,
          prompts: false,
        },
        resources: [
          {
            uri: `content://${domain}/pages`,
            name: "Website Pages",
            description: "Access to all indexed pages",
            mimeType: "application/json",
          },
          {
            uri: `content://${domain}/search`,
            name: "Content Search",
            description: "Search across website content",
            mimeType: "application/json",
          },
        ],
        tools: [
          {
            name: "get_page_content",
            description: "Retrieve content of a specific page",
            inputSchema: {
              type: "object",
              properties: {
                path: { type: "string", description: "Page path" },
              },
              required: ["path"],
            },
          },
          {
            name: "search_content",
            description: "Search website content",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Search query" },
                limit: { type: "number", description: "Max results", default: 10 },
              },
              required: ["query"],
            },
          },
        ],
      },
      null,
      2,
    )

    return NextResponse.json({ config })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
