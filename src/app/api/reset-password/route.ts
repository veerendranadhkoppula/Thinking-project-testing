// app/api/update-password/route.ts
import { NextResponse } from 'next/server'
import configPromise from '@/payload.config'
import { cookies } from 'next/headers'
import { encode } from 'next-auth/jwt'

export async function POST(req: Request) {
  const { token, password } = await req.json()

  if (!token || !password) {
    return NextResponse.json({ error: 'Missing token or password' }, { status: 400 })
  }

  // Load config to get server URL, or fallback to env var
  const config = await configPromise
  const serverURL = config.serverURL || process.env.PAYLOAD_SERVER_URL || 'http://localhost:3000'

  try {
    // Call Payload reset-password endpoint via REST API
    const res = await fetch(`${serverURL}/api/site-users/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      return NextResponse.json({ error: error.message || 'Password reset failed' }, { status: 400 })
    }

    const { user } = await res.json()

    // Issue NextAuth session token
    const sessionToken = await encode({
      token: { user: { id: user.id, email: user.email, name: user.name } },
      secret: process.env.NEXTAUTH_SECRET!,
    })

    const jar = await cookies()
    jar.set({
      name: 'next-auth.session-token',
      value: sessionToken,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[update-password]', err)
    return NextResponse.json({ error: err?.message || 'Password reset failed' }, { status: 400 })
  }
}
