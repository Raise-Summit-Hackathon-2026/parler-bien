import { NextRequest, NextResponse } from "next/server"

const COMPOSIO_CALLBACK =
  "https://backend.composio.dev/api/v3.1/toolkits/auth/callback"

/** Google redirects here; we forward the OAuth code to Composio (white-label flow). */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString()
  const target = query ? `${COMPOSIO_CALLBACK}?${query}` : COMPOSIO_CALLBACK
  return NextResponse.redirect(target, 302)
}
