/* eslint-disable @typescript-eslint/no-explicit-any */
import { headers } from 'next/headers'
import { getServerOrigin } from '@/lib/http'
import { requireAuth } from '@/lib/requireAuth'
import styles from './TicketDetail.module.css'
import Link from 'next/link' // 👈 added

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getTicket(id: string) {
  const origin = await getServerOrigin()
  const cookie = (await headers()).get('cookie') || ''
  const res = await fetch(`${origin}/api/tickets/${encodeURIComponent(id)}?depth=1`, {
    cache: 'no-store',
    credentials: 'include',
    headers: { cookie },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to load ticket ${id}, status ${res.status}: ${body}`)
  }
  return res.json()
}

async function getComments(id: string) {
  const origin = await getServerOrigin()
  const cookie = (await headers()).get('cookie') || ''
  const res = await fetch(
    `${origin}/api/comments?where[ticket][equals]=${encodeURIComponent(id)}&depth=1&sort=createdAt`,
    { cache: 'no-store', credentials: 'include', headers: { cookie } },
  )
  if (!res.ok) return { docs: [] }
  return res.json()
}

export default async function TicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAuth(`/tickets/${id}`)
  if (!id) throw new Error('Ticket id missing in URL')

  const ticket = await getTicket(id)
  const comments = await getComments(id)

  return (
    <div className={styles.container}>
      <div className={styles.ticketBox}>
        <h1 className={styles.title}>{ticket.title}</h1>
        <p className={styles.meta}>
          {ticket.priority?.toUpperCase()} • {String(ticket.status).replace('_', ' ')}
        </p>
        {ticket.url && (
          <p className={styles.url}>
            URL:{' '}
            <a href={ticket.url} target="_blank" rel="noreferrer" className={styles.urlLink}>
              {ticket.url}
            </a>
          </p>
        )}
        <div className={styles.description}>
          <p>{ticket.description || ''}</p>
        </div>
      </div>

      <CommentForm ticketId={String(ticket.id ?? id)} />

      <div className={styles.commentsBox}>
        <div className={styles.commentsHeader}>Comments</div>
        <ul className={styles.commentList}>
          {comments.docs.map((c: any) => (
            <li key={c.id} className={styles.commentItem}>
              <div className={styles.commentMeta}>
                {(c.author && (c.author.username || c.author.email)) || 'User'} •{' '}
                {new Date(c.createdAt).toLocaleString()}
              </div>
              <div className={styles.commentBody}>{c.body}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.backBtnWrapper}>
        <Link href="/tickets" className={styles.backBtn}>
          ← Back to Tickets
        </Link>
      </div>
    </div>
  )
}

function CommentForm({ ticketId }: { ticketId: string }) {
  const safeId = encodeURIComponent(ticketId)
  return (
    <form action={`/tickets/${safeId}/comment`} method="post" className={styles.commentForm}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <label className={styles.label}>Add comment</label>
      <textarea name="body" rows={4} required className={styles.textarea} />
      <button className={styles.button}>Post Comment</button>
    </form>
  )
}
