import { NextResponse } from 'next/server'
import payload from 'payload'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextAuthOptions'

// ✅ GET: list tickets
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userEmail = session?.user?.email || ''
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get('limit') ?? 50)
    const sort = searchParams.get('sort') ?? '-updatedAt'
    const page = Number(searchParams.get('page') ?? 1)

    // First resolve user by email → get their id
    const users = await payload.find({
      collection: 'site-users',
      where: { email: { equals: userEmail } },
      limit: 1,
    })
    if (!users.docs[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const userId = users.docs[0].id

    // Query tickets by relationship (reporter OR assignee)
    const tickets = await payload.find({
      collection: 'tickets',
      where: {
        or: [{ reporter: { equals: userId } }, { assignee: { equals: userId } }],
      },
      limit,
      page,
      sort,
    })

    return NextResponse.json(tickets)
  } catch (err) {
    console.error('API error (tickets GET)', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ✅ PATCH: update ticket status (like tasks API)
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userEmail = session?.user?.email || ''
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const ticketId = searchParams.get('ticketId')
    if (!ticketId) {
      return NextResponse.json({ error: 'Missing ticketId' }, { status: 400 })
    }

    const { status } = await req.json()
    if (!status) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400 })
    }

    // Fetch ticket with relationships populated
    const ticket = await payload.findByID({
      collection: 'tickets',
      id: ticketId,
      depth: 1,
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Safe email extraction
    function getEmail(user: unknown): string | null {
      if (typeof user === 'object' && user !== null && 'email' in user) {
        return (user as { email: string }).email
      }
      return null
    }

    const reporterEmail = getEmail(ticket.reporter)
    const assigneeEmail = getEmail(ticket.assignee)

    const isOwner = reporterEmail === userEmail || assigneeEmail === userEmail
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update ticket
    const updated = await payload.update({
      collection: 'tickets',
      id: ticketId,
      data: { status },
    })

    return NextResponse.json({ success: true, ticket: updated })
  } catch (err) {
    console.error('API error (tickets PATCH)', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
