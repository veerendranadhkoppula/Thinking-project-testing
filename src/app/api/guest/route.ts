import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

function rand(len = 6) {
  return Math.random()
    .toString(36)
    .slice(2, 2 + len)
}

export async function POST() {
  try {
    const payload = await getPayload({ config })

    const username = `guest_${rand()}`
    const email = `${username}@example.com`
    const password = rand(12)

    // Create guest in the SAME collection you use for login (here: "site-users")
    const created = await payload.create({
      collection: 'site-users',
      data: {
        email,
        password,
        name: username,
        role: 'member',
        // Do NOT rely on Payload login for guests.
        // If you really want them verified in DB, see the "Alt" section below.
      },
      // optional:
      // depth: 0,
      // overrideAccess: true,
    })

    // IMPORTANT: do not call payload.login(), which triggers verification check
    // Just return the fields NextAuth needs for its "guest" credentials provider.
    return NextResponse.json({
      success: true,
      id: created.id,
      email,
      username,
      role: 'member',
    })
  } catch (e) {
    console.error('Guest login error:', e)
    return NextResponse.json({ error: 'Guest login failed' }, { status: 500 })
  }
}
