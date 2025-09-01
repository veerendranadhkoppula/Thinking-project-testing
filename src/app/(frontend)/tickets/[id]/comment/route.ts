// app/api/tickets/[id]/comments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextAuthOptions'
import payload from 'payload'

export async function POST(
  req: NextRequest,
  context: any, // 👈 or remove the type entirely
): Promise<NextResponse> {
  const idParam = context.params.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam

  if (!id) {
    return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await req.formData()
  const raw = (form.get('ticketId') ?? id ?? '').toString().trim()
  const body = (form.get('body') ?? '').toString().trim()

  const users = await payload.find({
    collection: 'site-users',
    where: { email: { equals: session.user.email } },
    limit: 1,
  })

  if (!users.docs[0]) {
    throw new Error('User not found')
  }

  const userId = users.docs[0].id

  if (!raw) {
    return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 })
  }
  if (!body) {
    return NextResponse.json({ error: 'Comment body required' }, { status: 400 })
  }

  const ticket = /^\d+$/.test(raw) ? Number(raw) : raw

  const origin = req.nextUrl.origin
  const res = await fetch(`${origin}/api/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticket,
      body,
      author: userId,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    return new NextResponse(text || 'Failed to post comment', { status: 400 })
  }

  const redirectId = typeof ticket === 'number' ? String(ticket) : ticket
  return NextResponse.redirect(new URL(`/tickets/${encodeURIComponent(redirectId)}`, req.url))
}
