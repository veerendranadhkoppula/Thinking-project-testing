'use client'

import { Website } from '@/payload-types'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'

type Current = {
  label: string
  x: number
  y: number
  orientation?: boolean
  rotated: boolean
}

type Annotation = {
  id: string
  pageUrl: string
  x: number
  y: number
  width: number
  height: number
  type: 'comment' | 'task'
  message: string
  timestamp: number
}

export default function IframePreview({
  pageData,
  url,
  injectionType = 'Manual',
  latest = false,
  mode = 'viewer',
}: {
  pageData: Website
  url: string
  injectionType?: 'Proxy' | 'Extension' | 'Manual'
  latest?: boolean
  mode?: 'viewer' | 'commentor'
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const session = useSession()
  const userName = session?.data?.user?.name || ''
  const userEmail = session?.data?.user?.email || ''
  const [current, setCurrent] = useState<Current | null>(null)
  const [scale, setScale] = useState(1)
  const [pendingBox, setPendingBox] = useState<any | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [currentiFrameURL, setCurrentiFrameURL] = useState('')
  const [form, setForm] = useState<{ message: string; type: 'comment' | 'task' }>({
    message: '',
    type: 'comment',
  })
  const socketRef = useRef<any>(null)
  const iframeUrl = `/api/proxy/website/?url=${encodeURIComponent(url)}&latest=${latest ? '1' : '0'}`

  function extractRealUrl(proxyUrl: string): string {
    try {
      const params = new URL(proxyUrl).searchParams
      const innerUrl = params.get('url')
      if (innerUrl) return decodeURIComponent(innerUrl)
      return proxyUrl // fallback if no inner url
    } catch {
      return proxyUrl
    }
  }

  // Get viewport size from localStorage
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

  // Re-Render on Viewport Changed
  useEffect(() => {
    const read = () => {
      const raw = localStorage.getItem('selectedViewport')
      if (raw) {
        try {
          const vp = JSON.parse(raw)
          setCurrent(vp)
          if (iframeRef.current) {
            const existingThreads =
              pageData?.versions?.flatMap((v) =>
                v['page-links']?.flatMap((p) =>
                  p.thread
                    ?.filter((t) => p['page-link'] === currentiFrameURL)
                    .map((t) => ({
                      id: t['thread-id'],
                      comments: t.comments,
                      x: t.comments?.[0]?.ping?.x ?? 0,
                      y: t.comments?.[0]?.ping?.y ?? 0,
                      width: t.comments?.[0]?.ping?.width ?? 0,
                      height: t.comments?.[0]?.ping?.height ?? 0,

                      // ✅ carry over viewport information
                      viewport: t.viewport || null,
                      viewportOrientation: t['viewport-Orientation'] || null,
                    })),
                ),
              ) || []

            iframeRef.current.contentWindow?.postMessage(
              {
                type: 'website-proxy-control',
                action: 'render-annotations',
                threads: existingThreads,
                currentViewport: vp.label,
              },
              '*',
            )
          }
        } catch {}
      }
    }

    read()
    window.addEventListener('viewport:changed', read)
    return () => window.removeEventListener('viewport:changed', read)
  }, [pageData])

  // Mode changes message
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      iframe.contentWindow?.postMessage(
        { type: 'website-proxy-control', action: 'set-mode', mode },
        '*',
      )
    } catch (err) {
      console.warn('Failed to send mode to iframe:', err)
    }
  }, [mode])

  // Handle Scaling
  const dims = useMemo(() => {
    if (!current) return { w: 1920, h: 1080 }
    return current.rotated ? { w: current.y, h: current.x } : { w: current.x, h: current.y }
  }, [current])

  // Handle Resize
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const compute = () => {
      if (!el || !current) return
      const cw = el.clientWidth
      const ch = el.clientHeight
      if (cw === 0 || ch === 0) return

      const targetW = current.rotated ? current.y : current.x
      const targetH = current.rotated ? current.x : current.y

      if (targetW > cw || targetH > ch) {
        const s = Math.min(cw / targetW, ch / targetH)
        setScale(s)
      } else {
        setScale(1)
      }
    }

    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    window.addEventListener('resize', compute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', compute)
    }
  }, [dims.w, dims.h, current])

  // Listening Socket.io connection
  useEffect(() => {
    const initSocket = async () => {
      await fetch('/api/socket') // ensures server is ready
      const socket = io(window.location.origin, { path: '/api/socket' })
      socketRef.current = socket

      socket.on('connect', () => {
        // console.log('[Socket] Connected:', socket.id)
        // Join room based on website/page/version
        const owner = pageData?.admins?.[0]?.admin || ''
        const realUrl = currentiFrameURL
        const latestVersion = pageData?.versions?.[pageData.versions.length - 1]
        const latestVersionId = latestVersion?.id || '1'
        const roomId = `${owner}/${realUrl}/#${latestVersionId}`

        socket.emit('join-room', roomId, userName)
      })

      socket.on('thread:added', (thread) => {
        // console.log('===================== RECIVED THREAD ADDED =====================')
        const lastComment = thread.comments?.[thread.comments.length - 1]
        // console.log('Last Comment --------------', lastComment)
        const realUrl = extractRealUrl(lastComment.pageUrl)
        if (lastComment?.authorEmail === userEmail) return

        const newThreadForIframe = {
          id: thread['thread-id'],
          viewport: thread.viewport || current?.label || '',
          x: lastComment.ping?.x ?? 0,
          y: lastComment.ping?.y ?? 0,
          width: lastComment.ping?.width ?? 0,
          height: lastComment.ping?.height ?? 0,
          comments: thread.comments,
          pageUrl: realUrl,
        }

        // Update local state
        setAnnotations((prev) => [
          ...prev,
          {
            id: thread['thread-id'],
            pageUrl: pageData?.url ?? '',
            x: lastComment.ping?.x ?? 0,
            y: lastComment.ping?.y ?? 0,
            width: lastComment.ping?.width ?? 0,
            height: lastComment.ping?.height ?? 0,
            type: lastComment.commentType ?? 'comment',
            message: lastComment.message ?? '',
            timestamp: Date.now(),
          },
        ])
        window.dispatchEvent(new CustomEvent('ce:thread:added', { detail: newThreadForIframe }))

        // Send to iframe immediately
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: 'website-proxy-control',
            action: 'add-annotations',
            threads: [newThreadForIframe],
            currentViewport: current?.label || null,
          },
          '*',
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
  }, [pageData, userName, userEmail, current?.label, currentiFrameURL])

  // Load Annotations on iFrame
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'website-proxy-event' && event.data.action === 'page-changed') {
        const currentUrl = extractRealUrl(event.data.pageUrl)
        setCurrentiFrameURL(currentUrl)
        window.dispatchEvent(new CustomEvent('iframe:url:changed', { detail: currentUrl }))

        const existingThreads =
          pageData?.versions?.flatMap((v) =>
            v['page-links']?.flatMap((p) =>
              p.thread
                ?.filter((t) => p['page-link'] === currentUrl)
                .map((t) => ({
                  id: t['thread-id'],
                  comments: t.comments,
                  x: t.comments?.[0]?.ping?.x ?? 0,
                  y: t.comments?.[0]?.ping?.y ?? 0,
                  width: t.comments?.[0]?.ping?.width ?? 0,
                  height: t.comments?.[0]?.ping?.height ?? 0,
                  viewport: t.viewport || null,
                  viewportOrientation: t['viewport-Orientation'] || null,
                })),
            ),
          ) || []

        iframeRef.current?.contentWindow?.postMessage(
          {
            type: 'website-proxy-control',
            action: 'render-annotations',
            threads: existingThreads,
            currentViewport: current?.label || null,
          },
          '*',
        )
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [pageData, current?.label])

  // Listen for injected script messages
  useEffect(() => {
    const processedIds = new Set<string>()
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'website-proxy-event' && event.data.action === 'box-created') {
        if (!latest) {
          alert(
            'You are not on the latest version. Please switch to the latest version to comment.',
          )
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'website-proxy-control', action: 'unlock-drawing' },
            '*',
          )
          return
        }
        setPendingBox(event.data)
      } else if (
        event.data?.type === 'website-proxy-event' &&
        event.data.action === 'text-edited'
      ) {
        const payload = event.data.data
        if (!latest) {
          alert('You are not on the latest version. Please switch to the latest version to edit.')
          return
        }
        if (processedIds.has(payload['comment-id'])) {
          return
        }
        processedIds.add(payload['comment-id'])
        // ---- Build annotation ----
        const newAnnotation: Annotation = {
          id: payload['comment-id'],
          pageUrl: pageData?.url ?? '',
          x: payload.ping?.x ?? 0,
          y: payload.ping?.y ?? 0,
          width: payload.ping?.width ?? 0,
          height: payload.ping?.height ?? 0,
          type: payload.commentType ?? 'comment',
          message: payload.message ?? '',
          timestamp: Date.now(),
        }

        // ---- Extract from pageData ----
        const owner = pageData?.admins?.[0]?.admin || ''
        const realUrl = extractRealUrl(event.data.pageUrl)
        const latestVersion = pageData?.versions?.[pageData.versions.length - 1]
        const latestVersionId = latestVersion?.id || '1'
        const roomId = `${owner}/${realUrl}/#${latestVersionId}`

        // ---- Clone versions ----
        const updatedVersions = [...(pageData?.versions || [])]
        const versionIndex = updatedVersions.findIndex((v) => v.id === latestVersionId)
        let newCommentId = '1'
        if (versionIndex !== -1) {
          const version = updatedVersions[versionIndex]
          const pageLinks = version['page-links'] || []
          const pageLinkIndex = pageLinks.findIndex((p) => p['page-link'] === realUrl)
          if (pageLinkIndex !== -1) {
            const pageLink = pageLinks[pageLinkIndex]
            const threads = pageLink.thread || []
            const threadIndex = threads.findIndex((t) => t['thread-id'] === newAnnotation.id)
            if (threadIndex !== -1) {
              const existingThread = threads[threadIndex]
              newCommentId = String((existingThread.comments?.length || 0) + 1)
            }
          }
        }

        const newComment = {
          'comment-id': newCommentId,
          author: userName || 'Anonymous',
          authorEmail: userEmail || '',
          date: new Date(newAnnotation.timestamp).toISOString(),
          edited: false,
          editedAt: null,
          deleted: false,
          commentType: (payload.commentType ?? 'comment') as 'comment' | 'task',
          commentStatus: 'active' as 'active' | 'completed',
          ping: {
            x: newAnnotation.x,
            y: newAnnotation.y,
            height: newAnnotation.height,
            width: newAnnotation.width,
          },
          'text-edited': true,
          'text-edit': {
            selector: payload['text-edit'].selector ?? '',
            oldText: payload['text-edit'].oldText ?? '',
            newText: payload['text-edit'].newText ?? '',
          },
          message: newAnnotation.message,
          viewport: current?.label || '',
          'viewport-Orientation': current?.orientation || false,
        }

        const newThread = {
          'thread-id': newAnnotation.id,
          viewport: current?.label || '',
          'viewport-Orientation': current?.orientation || false,
          comments: [newComment],
          pageUrl: realUrl,
        }

        // ---- Update versions ----
        if (versionIndex === -1) {
          updatedVersions.push({
            id: latestVersionId,
            'page-links': [{ 'page-link': realUrl, roomId, thread: [newThread] }],
          })
        } else {
          const version = { ...updatedVersions[versionIndex] }
          const pageLinks = [...(version['page-links'] || [])]
          const pageLinkIndex = pageLinks.findIndex((p) => p['page-link'] === realUrl)

          if (pageLinkIndex === -1) {
            pageLinks.push({ 'page-link': realUrl, roomId, thread: [newThread] })
          } else {
            const pageLink = { ...pageLinks[pageLinkIndex] }
            const threads = [...(pageLink.thread || [])]

            const threadIndex = threads.findIndex((t) => t['thread-id'] === newThread['thread-id'])
            if (threadIndex === -1) {
              threads.push(newThread)
            } else {
              const existingThread = { ...threads[threadIndex] }
              existingThread.comments = [...(existingThread.comments || []), newComment]
              threads[threadIndex] = existingThread
            }

            pageLink.thread = threads
            pageLinks[pageLinkIndex] = pageLink
          }

          version['page-links'] = pageLinks
          updatedVersions[versionIndex] = version
        }

        // ---- Build final payload ----
        const payloadData = {
          url: pageData?.url,
          pageUrl: realUrl,
          admins: pageData?.admins || [],
          roomId,
          thread: newThread,
          title: pageData?.title || '',
          enableDefaultViewports: pageData?.enableDefaultViewports ?? true,
          type: {
            injectionType: injectionType,
            mediaType: 'Website',
          },
        }

        // ---- Local state + save ----
        setAnnotations((prev) => [...prev, newAnnotation])
        // console.log('Final Payload Data: ', payloadData)

        fetch('/api/canvas/save/Website', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadData),
        })
          .then((res) => res.json())
          .then((data) => {
            window.dispatchEvent(new CustomEvent('ce:thread:added', { detail: newThread }))
            socketRef.current?.emit('thread:add', { roomId, thread: newThread })
          })
          .catch((err) => console.error('Error saving Website:', err))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [current?.label, current?.orientation, latest, userEmail, userName])

  const handleSave = () => {
    if (!pendingBox) return

    const newAnnotation: Annotation = {
      ...pendingBox,
      type: form.type,
      message: form.message,
    }

    const owner = pageData?.admins?.[0]?.admin || ''
    const realUrl = extractRealUrl(pendingBox.pageUrl)

    const latestVersion = pageData?.versions?.[pageData.versions.length - 1]
    const latestVersionId = latestVersion?.id || '1'

    // Debug logs
    // console.log(
    //   '============================ PENDING URL ============================',
    //   pendingBox.pageUrl,
    // )
    // console.log(
    //   '============================ PENDING REAL URL EXTRACTED ============================',
    //   realUrl,
    // )
    // console.log(
    //   '============================ ROOM ID  ============================',
    //   `${owner}/${realUrl}/#${latestVersionId}`,
    // )

    const roomId = `${owner}/${realUrl}/#${latestVersionId}`

    // ---- Generate new comment ----
    const newComment = {
      'comment-id': String(Date.now()), // simpler unique id
      author: userName || 'Anonymous',
      authorEmail: userEmail || '',
      date: new Date(newAnnotation.timestamp).toISOString(),
      edited: false,
      editedAt: null,
      commentType: newAnnotation.type,
      ping: {
        x: newAnnotation.x,
        y: newAnnotation.y,
        height: newAnnotation.height,
        width: newAnnotation.width,
      },
      message: newAnnotation.message,
      viewport: current?.label || '',
      'viewport-Orientation': current?.orientation || false,
    }

    // ---- New thread wrapper ----
    const newThread = {
      'thread-id': newAnnotation.id,
      viewport: current?.label || '',
      'viewport-Orientation': current?.orientation || false,
      comments: [newComment],
      pageUrl: realUrl,
    }

    const payloadData = {
      url: pageData?.url,
      pageUrl: realUrl,
      admins: pageData?.admins,
      roomId,
      thread: newThread,
      title: pageData?.title,
      type: {
        injectionType: injectionType,
        mediaType: 'Website',
      },
    }

    // ---- Local state ----
    setAnnotations((prev) => [...prev, newAnnotation])
    setPendingBox(null)
    setForm({ message: '', type: 'comment' })

    // ---- Save only thread ----
    fetch('/api/canvas/save/Website', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadData),
    })
      .then((res) => res.json())
      .then((data) => {
        window.dispatchEvent(new CustomEvent('ce:thread:added', { detail: newThread }))
        socketRef.current?.emit('thread:add', {
          roomId,
          thread: newThread,
        })
      })
      .catch((err) => console.error('Error saving Website:', err))

    iframeRef.current?.contentWindow?.postMessage(
      { type: 'website-proxy-control', action: 'unlock-drawing' },
      '*',
    )
  }

  const handleCancel = () => {
    setPendingBox(null)
    setForm({ message: '', type: 'comment' })

    iframeRef.current?.contentWindow?.postMessage(
      { type: 'website-proxy-control', action: 'remove-last-box' },
      '*',
    )
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'website-proxy-control', action: 'unlock-drawing' },
      '*',
    )
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden relative"
    >
      {/* Iframe */}
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <div
          style={{
            width: dims.w,
            height: dims.h,
            background: '#f8f8f8',
            borderRadius: '8px',
            boxShadow: '0 5px 8px rgba(0,0,0,0.35)',
            overflow: 'hidden',
          }}
        >
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            id="proxy-frame"
            width={dims.w}
            height={dims.h}
            style={{
              border: 'none',
              display: 'block',
              width: '100%',
              height: '100%',
            }}
            className="no-scrollbar"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
          />
        </div>
      </div>

      {/* Popup form when a box is created */}
      {pendingBox && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-lg p-4 w-96 z-50">
          <h2 className="font-semibold mb-2">Add annotation</h2>
          <textarea
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Enter your comment or task..."
            className="w-full border rounded p-2 mb-3"
          />
          <div className="mb-3">
            <label className="mr-3">
              <input
                type="radio"
                name="annotationType"
                checked={form.type === 'comment'}
                onChange={() => setForm((f) => ({ ...f, type: 'comment' }))}
              />{' '}
              Comment
            </label>
            <label>
              <input
                type="radio"
                name="annotationType"
                checked={form.type === 'task'}
                onChange={() => setForm((f) => ({ ...f, type: 'task' }))}
              />{' '}
              Task
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
