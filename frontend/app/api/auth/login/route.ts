import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    // Demo login - accept any valid email/password combo
    // In production, validate against a real auth provider
    if (email && password.length >= 4) {
      const token = Buffer.from(`${email}:${Date.now()}`).toString("base64")
      return NextResponse.json({
        access_token: token,
        token_type: "bearer",
        expires_in: 86400,
      })
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Login failed" }, { status: 500 })
  }
}
