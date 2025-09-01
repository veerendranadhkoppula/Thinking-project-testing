import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { cookies } from 'next/headers'
import { encode } from 'next-auth/jwt'

export async function POST(req: Request) {
  const { email, password } = await req.json()
  const payload = await getPayload({ config: configPromise })

  try {
    const { user } = await payload.login({
      collection: 'site-users',
      data: { email, password },
    })

    // ⚠️ Only allow verified users
    if (!user._verified) {
      return NextResponse.json({ error: 'Email not verified' }, { status: 403 })
    }

    // Create JWT session token
    const token = await encode({
      token: { user },
      secret: process.env.NEXTAUTH_SECRET!,
    })

    // Set cookie manually
    const cookieStore = await cookies()

    cookieStore.set({
      name: 'next-auth.session-token',
      value: token,
      httpOnly: true,
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Login failed' }, { status: 401 })
  }
}
