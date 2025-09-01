'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

type Comment = {
  'comment-id'?: string | null
  date?: string | null
  author?: string | null
  authorEmail?: string | null
  ping?: { x?: number | null; y?: number | null } | null
  message?: string | null
  id?: string | null
  edited?: boolean | null
  editedAt?: string | null
  commentType?: 'comment' | 'task' | null
  commentStatus?: 'active' | 'completed' | null
  deleted?: boolean | null
}

type Thread = {
  'thread-id'?: string | null
  viewport?: string | null
  comments?: Comment[] | null
  id?: string | null
  pageUrl?: string | null
}

interface CommentsButtonProps {
  threads: Thread[]
}

type Current = {
  label: string
  x: number
  y: number
  orientation?: boolean
  rotated: boolean
}

function TaskStatusBadge({
  status,
  deleted,
}: {
  status?: 'active' | 'completed' | null
  deleted?: boolean | null
}) {
  if (!status && !deleted) return null

  const label = deleted ? 'Deleted' : status === 'completed' ? 'Completed' : 'Active'

  const color = deleted
    ? 'bg-red-100 text-red-700 border-red-200'
    : status === 'completed'
      ? 'bg-green-100 text-green-700 border-green-200'
      : 'bg-yellow-100 text-yellow-700 border-yellow-200'

  return (
    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border ${color}`}>
      {label}
    </span>
  )
}

export function CommentsButton({
  threads: initialThreads,
  websiteId,
  version,
  pageLink,
  latest,
}: CommentsButtonProps & {
  websiteId: string | string[] | undefined
  version: string | string[] | undefined
  pageLink: string
  latest: boolean
}) {
  const [open, setOpen] = useState(false)
  const [threads, setThreads] = useState<Thread[]>(initialThreads)
  const [expandedThread, setExpandedThread] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const session = useSession()
  const [current, setCurrent] = useState<Current | null>(null)
  const [showAll, setShowAll] = useState(false)
  const socketRef = useRef<any>(null)
  const [editing, setEditing] = useState<{
    threadId: string
    commentId: string
    draft: string
  } | null>(null)

  const userName = session?.data?.user?.name || ''
  const userEmail = session?.data?.user?.email || ''
  const [iframeUrl, setIframeUrl] = useState<string>('')

  useEffect(() => {
    const handleIframeUrlChange = (e: Event) => {
      const url = (e as CustomEvent<string>).detail
      setIframeUrl(url)
      // console.log('Updated iframe URL in CommentsButton:', url)
    }
    window.addEventListener('iframe:url:changed', handleIframeUrlChange)
    return () => window.removeEventListener('iframe:url:changed', handleIframeUrlChange)
  }, [])

  useEffect(() => {
    function onTaskStatusUpdated(e: Event) {
      const { detail } = e as CustomEvent<{
        versionId: string | null
        pageLinkId: string | null
        threadId: string | null
        commentId: string | null
        newStatus: 'active' | 'completed'
      }>

      if (!detail?.commentId) return

      setThreads((prev) =>
        prev.map((t) => {
          // If we know the thread, narrow to it; otherwise scan all threads
          const tid = t['thread-id'] ?? t.id
          if (detail.threadId && tid !== detail.threadId) return t

          const comments = (t.comments ?? []).map((c) => {
            const cid = c['comment-id'] ?? c.id
            if (cid === detail.commentId) {
              // Only task comments show the badge
              return {
                ...c,
                commentType: c.commentType ?? 'task',
                commentStatus: detail.newStatus,
              }
            }
            return c
          })
          return { ...t, comments }
        }),
      )
    }

    window.addEventListener('task:status-updated', onTaskStatusUpdated)
    return () => window.removeEventListener('task:status-updated', onTaskStatusUpdated)
  }, [])

  useEffect(() => {
    const initSocket = async () => {
      await fetch('/api/socket')
      const socket = io(window.location.origin, { path: '/api/socket' })
      socketRef.current = socket

      socket.on('connect', () => {
        // console.log('[Socket] Connected:', socket.id)
        socket.emit('join-room', pageLink, userName)
      })

      socket.on('comment:added', ({ threadId, comment }) => {
        // console.log(comment.authorEmail, userEmail)
        if (comment.authorEmail === userEmail) return
        const normalized = { ...comment, 'comment-id': comment['comment-id'] ?? comment.id }
        setThreads((prev) =>
          prev.map((t) =>
            (t['thread-id'] ?? t.id) === threadId
              ? { ...t, comments: [...(t.comments ?? []), normalized] }
              : t,
          ),
        )
      })

      socket.on('comment:deleted', ({ threadId, commentId }) => {
        setThreads((prev) =>
          prev.map((t) => {
            if ((t['thread-id'] ?? t.id) !== threadId) return t
            const updated = (t.comments ?? []).map((c) => {
              const cid = c['comment-id'] ?? c.id
              if (cid !== commentId) return c
              return {
                ...c,
                'comment-id': cid,
                deleted: true,
                message: 'Comment Deleted',
                ping: { x: -1, y: -1, width: 0, height: 0 },
              }
            })
            postToProxyIframe({
              type: 'website-proxy-control',
              action: 'delete-thread-by-id',
              threadId: threadId,
            })
            return { ...t, comments: updated }
          }),
        )
      })

      socket.on('comment:edited', ({ threadId, commentId, message }) => {
        // console.log('[Socket] comment:edited', threadId, commentId)
        setThreads((prev) =>
          prev.map((t) => {
            if ((t['thread-id'] ?? t.id) !== threadId) return t
            const updated = (t.comments ?? []).map((c) => {
              const cid = c['comment-id'] ?? c.id
              if (cid !== commentId) return c
              return { ...c, message, edited: true, editedAt: new Date().toISOString() }
            })
            return { ...t, comments: updated }
          }),
        )
      })

      socket.on('disconnect', () => {
        // console.log('[Socket] Disconnected')
      })
    }

    initSocket()
    return () => {
      socketRef.current?.disconnect()
    }
  }, [pageLink, userName])

  useEffect(() => {
    function handleThreadAdded(e: Event) {
      // console.log('CUSTOM EVENT RECIEVED ON IFRAME')
      const custom = e as CustomEvent<Thread>
      const newThread = custom.detail
      setThreads((prev) => {
        const idx = prev.findIndex((t) => (t['thread-id'] ?? t.id) === newThread['thread-id'])
        if (idx === -1) return [...prev, newThread]
        const updated = [...prev]
        updated[idx] = {
          ...updated[idx],
          comments: [...(updated[idx].comments ?? []), ...(newThread.comments ?? [])],
        }
        return updated
      })
    }

    window.addEventListener('ce:thread:added', handleThreadAdded)
    return () => window.removeEventListener('ce:thread:added', handleThreadAdded)
  }, [])

  useEffect(() => {
    const read = () => {
      const raw = localStorage.getItem('selectedViewport')
      if (raw) {
        try {
          setCurrent(JSON.parse(raw))
        } catch {}
      }
    }
    read()
    window.addEventListener('viewport:changed', read)
    return () => window.removeEventListener('viewport:changed', read)
  }, [])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!panelRef.current) return
      if (e.target instanceof Node && !panelRef.current.contains(e.target)) {
        setOpen(false)
        setEditing(null)
      }
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  useEffect(() => {
    setThreads(initialThreads ?? [])
    setExpandedThread(null)
    setEditing(null)
  }, [initialThreads])

  async function handleAddComment(threadId: string, message: string) {
    if (!message.trim()) return

    const newComment: Comment = {
      'comment-id': crypto.randomUUID(),
      date: new Date().toISOString(),
      message,
      ping: { x: -1, y: -1 },
      author: userName,
      authorEmail: userEmail,
      edited: false,
      editedAt: null,
    }

    // Optimistic update
    setThreads((prev) =>
      prev.map((thread) =>
        (thread['thread-id'] ?? thread.id) === threadId
          ? { ...thread, comments: [...(thread.comments ?? []), newComment] }
          : thread,
      ),
    )

    // Persist to DB (unchanged)
    try {
      const res = await fetch(`/api/canvas/commentbox/reply?id=${websiteId}&version=${version}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageLink,
          threadId,
          viewport: current?.label,
          comment: {
            ...newComment,
            author: userName || 'Guest',
            authorEmail: userEmail || 'guest@example.com',
          },
        }),
      })
      if (res.ok) {
        const data = await res.json().catch(() => null)
        if (data?.thread?.comments) {
          setThreads((prev) =>
            prev.map((t) =>
              (t['thread-id'] ?? t.id) === threadId ? { ...t, comments: data.thread.comments } : t,
            ),
          )
        }
      }
    } catch (err) {
      console.error('Failed to send comment', err)
    }
    // Emit to socket
    socketRef.current?.emit('comment:add', { roomId: pageLink, threadId, comment: newComment })
  }

  async function handleEditComment(threadId: string, commentId: string, newMessage: string) {
    if (!newMessage.trim()) return
    setThreads((prev) =>
      prev.map((t) => {
        const tid = t['thread-id'] ?? t.id
        if (tid !== threadId || !t.comments?.length) return t
        const lastIdx = t.comments.length - 1
        const idx = t.comments.findIndex((c) => (c['comment-id'] ?? c.id) === commentId)
        if (idx !== lastIdx) return t
        const target = t.comments[idx]
        if ((target.authorEmail ?? '') !== userEmail) return t
        if (target.edited) return t

        const now = new Date().toISOString()
        const updated = [...t.comments]
        updated[idx] = {
          ...updated[idx],
          message: newMessage,
          date: now,
          edited: true, // NEW
          editedAt: now, // NEW
        }
        return { ...t, comments: updated }
      }),
    )
    setEditing(null)
    try {
      const res = await fetch(`/api/canvas/commentbox/edit?id=${websiteId}&version=${version}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageLink,
          threadId,
          commentId,
          viewport: current?.label,
          message: newMessage,
        }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.thread?.comments) {
        setThreads((prev) =>
          prev.map((t) =>
            (t['thread-id'] ?? t.id) === threadId ? { ...t, comments: data.thread.comments } : t,
          ),
        )
      } else if (!res.ok) {
        console.error('Edit failed', data?.error || res.statusText)
      }
    } catch (err) {
      console.error('Failed to edit comment', err)
    }
    socketRef.current?.emit('comment:edit', {
      roomId: pageLink,
      threadId,
      commentId,
      message: newMessage,
    })
  }

  async function handleDeleteComment(threadId: string, commentId: string) {
    setThreads((prev) =>
      prev.map((t) => {
        if ((t['thread-id'] ?? t.id) !== threadId) return t
        const updated = (t.comments ?? []).map((c) =>
          (c['comment-id'] ?? c.id) === commentId
            ? {
                ...c,
                deleted: true,
                message: 'Comment Deleted',
                ping: {
                  x: -1,
                  y: -1,
                  width: 0,
                  height: 0,
                },
              }
            : c,
        )
        postToProxyIframe({
          type: 'website-proxy-control',
          action: 'delete-thread-by-id',
          threadId: threadId,
        })
        return { ...t, comments: updated }
      }),
    )
    try {
      await fetch(`/api/canvas/commentbox/delete?id=${websiteId}&version=${version}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageLink, threadId, commentId }),
      })
    } catch (err) {
      console.error('Failed to delete comment', err)
    }
    socketRef.current?.emit('comment:delete', { roomId: pageLink, threadId, commentId })
    // console.log('Socket.io -> [comment:delete]', pageLink, threadId, commentId)
  }

  function postToProxyIframe(message: any) {
    const iframe = document.getElementById('proxy-frame') as HTMLIFrameElement | null
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(message, '*')
    } else {
      console.warn('[CommentsButton] Proxy iframe not found')
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-2 text-sm rounded-xl border shadow-sm bg-white hover:bg-gray-50"
      >
        Comments
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed top-0 right-0 z-50 w-96 h-full rounded-l-xl border bg-white shadow-lg flex flex-col"
        >
          <div className="sticky top-0 bg-white/90 backdrop-blur px-3 py-2 border-b flex justify-between items-center">
            <span className="text-sm font-medium">Comments</span>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setShowAll((prev) => !prev)}
                className="text-xs px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100"
              >
                {showAll ? 'Show Current' : 'Show All'}
              </button>
              <button
                onClick={() => {
                  setOpen(false)
                  setEditing(null)
                }}
                className="text-xs px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100"
              >
                X
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {threads
              .filter((thread) =>
                showAll ? true : thread.pageUrl === iframeUrl && thread.viewport === current?.label,
              )
              .map((thread) => {
                const id =
                  thread['thread-id'] ??
                  thread.id ??
                  `${thread.viewport ?? 'vp'}:${(thread.comments?.[0]?.message ?? '').slice(0, 32)}`
                const firstComment = thread.comments?.[0]?.message ?? 'Untitled thread'
                const isExpanded = expandedThread === id
                const hasDeleted = Boolean(thread.comments?.[0]?.deleted)
                return (
                  <div key={id} className="border rounded">
                    <button
                      onClick={() => setExpandedThread(isExpanded ? null : id)}
                      className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-t flex justify-between"
                    >
                      <span className="text-sm font-medium flex gap-2 flex-col">
                        {firstComment}
                        <span className="text-xs text-gray-400">
                          {thread.viewport ? `Viewport: ${thread.viewport}` : 'No viewport'}
                          {thread.viewport ? `Page: ${thread.pageUrl}` : ''}
                        </span>
                      </span>
                      <span>{isExpanded ? '▲' : '▼'}</span>
                    </button>

                    {isExpanded && (
                      <div className="p-3 space-y-3">
                        {!hasDeleted && !showAll && (
                          <button
                            onClick={() => {
                              const threadId = thread['thread-id'] ?? thread.id
                              // console.log('[CommentPanel] Highlight request for thread', threadId)
                              postToProxyIframe({
                                type: 'website-proxy-control',
                                action: 'highlight-thread',
                                threadId,
                              })
                            }}
                            className="text-xs px-2 py-1 rounded border bg-yellow-50 hover:bg-yellow-100"
                          >
                            Highlight
                          </button>
                        )}
                        {thread.comments?.map((comment, idx) => {
                          const cid = comment['comment-id'] ?? comment.id ?? ''
                          const isLast = (thread.comments?.length ?? 0) - 1 === idx
                          const isEditing =
                            editing && editing.threadId === id && editing.commentId === cid
                          const canEdit =
                            latest &&
                            isLast &&
                            cid &&
                            !isEditing &&
                            (comment.authorEmail ?? '') === userEmail &&
                            !comment.edited // only once
                          return (
                            <div key={idx} className="border p-2 rounded">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs text-gray-500 flex items-center gap-2">
                                  {comment.date
                                    ? new Date(comment.date).toLocaleString()
                                    : 'No date'}
                                  {comment.edited ? (
                                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-gray-100 border text-gray-600">
                                      Edited
                                    </span>
                                  ) : null}
                                </p>

                                {canEdit && !comment.deleted && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditing({
                                          threadId: id,
                                          commentId: cid,
                                          draft: comment.message ?? '',
                                        })
                                      }
                                      className="text-xs px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100 whitespace-nowrap"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(id, cid)}
                                      className="text-xs px-2 py-1 rounded border bg-red-50 hover:bg-red-100 whitespace-nowrap"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>

                              {!isEditing ? (
                                <div className="mt-1 flex items-start gap-2">
                                  <p className="whitespace-pre-wrap flex-1">
                                    {comment.message ?? 'No message'}
                                  </p>
                                  {comment.commentType === 'task' && (
                                    <TaskStatusBadge
                                      status={comment.commentStatus ?? 'active'}
                                      deleted={comment.deleted}
                                    />
                                  )}
                                </div>
                              ) : (
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault()
                                    handleEditComment(id, cid, editing!.draft)
                                  }}
                                  className="mt-2 flex gap-2"
                                >
                                  <input
                                    value={editing.draft}
                                    onChange={(e) =>
                                      setEditing((prev) =>
                                        prev ? { ...prev, draft: e.target.value } : prev,
                                      )
                                    }
                                    className="flex-1 border rounded px-2 py-1 text-sm"
                                    autoFocus
                                  />
                                  <button
                                    type="submit"
                                    className="px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="18"
                                      height="18"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        fill="currentColor"
                                        d="m10.5 16.2l-4-4l1.4-1.4l2.6 2.6l5.6-5.6l1.4 1.4l-7 7Z"
                                      />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditing(null)}
                                    className="px-3 py-1 text-sm rounded border bg-gray-50 hover:bg-gray-100"
                                  >
                                    X
                                  </button>
                                </form>
                              )}

                              {(comment.author || comment.authorEmail) && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {comment.author ? `Author: ${comment.author}` : null}
                                  {comment.authorEmail ? `, ${comment.authorEmail}` : null}
                                </p>
                              )}
                            </div>
                          )
                        })}
                        {latest && !hasDeleted && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault()
                              const input = e.currentTarget.elements.namedItem(
                                'newComment',
                              ) as HTMLInputElement
                              handleAddComment(id, input.value)
                              input.value = ''
                            }}
                            className="flex gap-2"
                          >
                            <input
                              name="newComment"
                              placeholder="Write a message..."
                              className="flex-1 border rounded px-2 py-1 text-sm"
                            />
                            <button
                              type="submit"
                              className="px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
                            >
                              Send
                            </button>
                          </form>
                        )}
                        {latest && hasDeleted && (
                          <p className="text-xs text-gray-400 italic">
                            Replies are disabled for this thread.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
