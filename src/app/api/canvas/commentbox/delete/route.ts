import { NextResponse } from 'next/server'
import payload from 'payload'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextAuthOptions'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const serverUserEmail = session?.user?.email || ''

    const { searchParams } = new URL(req.url)
    const websiteId = searchParams.get('id')
    const versionParam = searchParams.get('version')
    const versionIndex = versionParam ? Number(versionParam) - 1 : 0

    const { pageLinkIndex, pageLink, threadId, commentId } = await req.json()

    if (!websiteId || !threadId || !commentId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (!serverUserEmail) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const website = await payload.findByID({ collection: 'Website', id: websiteId })
    if (!website) return NextResponse.json({ error: 'Website not found' }, { status: 404 })

    const versions = [...(website.versions ?? [])]
    if (!versions[versionIndex]) {
      return NextResponse.json({ error: 'Invalid version index' }, { status: 400 })
    }

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

    const threads = [...(pageLinks[pIdx].thread ?? [])]
    const tIdx = threads.findIndex((t: any) => t['thread-id'] === threadId)
    if (tIdx === -1) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })

    const thread = { ...(threads[tIdx] ?? {}), comments: [...(threads[tIdx]?.comments ?? [])] }
    const comments = thread.comments as any[]
    if (!comments.length)
      return NextResponse.json({ error: 'No comments to delete' }, { status: 409 })

    const lastIdx = comments.length - 1
    const last = comments[lastIdx]
    const lastId = last?.['comment-id'] ?? last?.id
    if (!lastId) return NextResponse.json({ error: 'Last comment has no id' }, { status: 409 })

    if (lastId !== commentId) {
      const existsEarlier = comments.some((c) => (c['comment-id'] ?? c.id) === commentId)
      return NextResponse.json(
        {
          error: existsEarlier
            ? 'Only the latest comment can be deleted'
            : 'Comment not found in thread',
        },
        { status: 409 },
      )
    }

    const lastAuthorEmail: string = last?.authorEmail || ''
    if (!lastAuthorEmail || lastAuthorEmail !== serverUserEmail) {
      return NextResponse.json(
        { error: 'Not allowed: only the original author can delete their latest comment' },
        { status: 403 },
      )
    }

    // Mark deleted instead of removing
    comments[lastIdx] = {
      ...last,
      ping: { x: -1, y: -1, width: 0, height: 0 },
      message: 'Comment Deleted',
      deleted: true,
    }

    thread.comments = comments
    threads[tIdx] = thread
    pageLinks[pIdx].thread = threads
    versions[versionIndex]['page-links'] = pageLinks

    const updatedWebsite = await payload.update({
      collection: 'Website',
      id: websiteId,
      data: { versions },
    })

    return NextResponse.json({
      success: true,
      thread,
      deletedComment: comments[lastIdx],
      website: updatedWebsite,
    })
  } catch (err) {
    console.error('API error (delete)', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
