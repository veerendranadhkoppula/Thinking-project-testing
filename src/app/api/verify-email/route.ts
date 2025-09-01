// app/api/verify-email/route.ts
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'

export async function POST(req: Request) {
  const { token } = await req.json()
  const payload = await getPayload({ config: configPromise })

  try {
    await payload.verifyEmail({
      collection: 'site-users',
      token,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
  }
}
