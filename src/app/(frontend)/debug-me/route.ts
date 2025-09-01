import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get('cookie') || ''
  const hasPayloadToken = cookieHeader.split(';').some(c => c.trim().startsWith('payload-token='))
  const origin = req.nextUrl.origin
  const meRes = await fetch(`${origin}/api/users/me`, { headers: { cookie: cookieHeader } })
  const me = await meRes.json().catch(() => null)
  return NextResponse.json({ hasPayloadToken, meStatus: meRes.status, me })
}
