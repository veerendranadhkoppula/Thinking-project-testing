// app/api/tickets/route.ts (or wherever this lives)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextAuthOptions'
import payload from 'payload'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const origin = req.nextUrl.origin
  const body = await req.json()
  const users = await payload.find({
    collection: 'site-users',
    where: { email: { equals: session.user.email } },
    limit: 1,
  })
  if (!users.docs[0]) {
    throw new Error('User not found')
  }
  const userId = users.docs[0].id
  const r = await fetch(`${origin}/api/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, reporter: userId }),
  })

  return NextResponse.json(await r.json().catch(() => null), { status: r.status })
}
