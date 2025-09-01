import { NextResponse } from 'next/server'
import payload from 'payload'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextAuthOptions'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userName = session?.user?.name ?? ''
    const userEmail = session?.user?.email ?? ''

    const { searchParams } = new URL(req.url)
    const websiteId = searchParams.get('id')
    const versionParam = searchParams.get('version')
    const versionIndex = versionParam ? Number(versionParam) - 1 : 0

    // Accept either pageLinkIndex or pageLink, and optional viewport
    const body = await req.json()
    const {
      pageLinkIndex,
      pageLink,
      threadId,
      viewport, // optional, so you can tag the thread with current viewport
      comment, // { message?, ping?, ... } from client
    }: {
      pageLinkIndex?: number
      pageLink?: string
      threadId: string
      viewport?: string
      comment: any
    } = body

    if (!websiteId || !threadId || !comment) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (!userEmail) {
      // Require auth to create comments so authorEmail is always present
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    // Fetch Website doc
    const website = await payload.findByID({
      collection: 'Website',
      id: websiteId,
    })
    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    // Ensure valid version
    const versions = [...(website.versions ?? [])]
    if (!versions[versionIndex]) {
      return NextResponse.json({ error: 'Invalid version index' }, { status: 400 })
    }

    // Resolve page link by index or by value, fallback to 0
    const pageLinks = [...(versions[versionIndex]['page-links'] ?? [])]
    let pIdx =
      typeof pageLinkIndex === 'number'
        ? pageLinkIndex
        : pageLink
          ? pageLinks.findIndex((pl: any) => pl?.['page-link'] === pageLink)
          : 0
    if (pIdx < 0) pIdx = 0
    if (!pageLinks[pIdx]) {
      return NextResponse.json({ error: 'Invalid page-link index' }, { status: 400 })
    }

    // Build new comment; trust server identity
    const newComment = {
      'comment-id': comment['comment-id'] ?? crypto.randomUUID(),
      date: new Date().toISOString(),
      ping: comment.ping ?? { x: -1, y: -1 },
      message: typeof comment.message === 'string' ? comment.message : '',
      author: userName,
      authorEmail: userEmail, // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
    }

    // Find or create thread
    const threads = [...(pageLinks[pIdx].thread ?? [])]
    let thread = threads.find((t: any) => t['thread-id'] === threadId)

    if (!thread) {
      thread = { 'thread-id': threadId, comments: [] as any[] }
      if (viewport) thread.viewport = viewport
      threads.push(thread)
    } else if (viewport && !thread.viewport) {
      thread.viewport = viewport
    }

    thread.comments = [...(thread.comments ?? []), newComment]
    pageLinks[pIdx].thread = threads
    versions[versionIndex]['page-links'] = pageLinks

    // Save back to Payload
    const updatedWebsite = await payload.update({
      collection: 'Website',
      id: websiteId,
      data: { versions },
    })

    return NextResponse.json({
      success: true,
      thread,
      website: updatedWebsite,
    })
  } catch (err) {
    console.error('API error (reply)', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
