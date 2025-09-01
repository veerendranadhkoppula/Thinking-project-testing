import { useEffect, useMemo, useRef, useState } from 'react'

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'error'

/** case-insensitive cache: keys are lowercased */
const memoryCache = new Map<string, boolean>()
let reqSeq = 0

/** Keep user’s case; strip disallowed chars; clamp length */
function sanitizeClient(s: string) {
  return (s || '')
    .trim()
    .replace(/[^A-Za-z0-9_.-]+/g, '')
    .slice(0, 30)
}

/** Optional helper to invalidate cache entries (call after signup or 409) */
export function invalidateUsernameCache(username: string) {
  const key = sanitizeClient(username).toLowerCase()
  if (key) memoryCache.delete(key)
}

export function useUsernameAvailability(username: string) {
  const [status, setStatus] = useState<Status>('idle')
  const [available, setAvailable] = useState<boolean | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const mySeqRef = useRef<number>(0)

  // preserve case for UI/API, sanitize only format; cache key is lowercased
  const sanitized = useMemo(() => sanitizeClient(username), [username])
  const cacheKey = useMemo(() => sanitized.toLowerCase(), [sanitized])

  useEffect(() => {
    // cancel any in-flight when input clears or changes
    abortRef.current?.abort()

    if (!sanitized) {
      setStatus('idle')
      setAvailable(null)
      return
    }

    // cache hit (case-insensitive)
    if (memoryCache.has(cacheKey)) {
      const ok = memoryCache.get(cacheKey)!
      setAvailable(ok)
      setStatus(ok ? 'available' : 'taken')
      return
    }

    // LIVE request on every change (no debounce)
    setStatus('checking')
    setAvailable(null)

    const ctrl = new AbortController()
    abortRef.current = ctrl

    const mySeq = ++reqSeq
    mySeqRef.current = mySeq
    ;(async () => {
      try {
        const res = await fetch(
          `/api/username-available?username=${encodeURIComponent(sanitized)}`,
          { signal: ctrl.signal, cache: 'no-store' },
        )
        if (!res.ok) throw new Error('bad status')
        const data: { available?: boolean } = await res.json()

        // ignore stale responses
        if (mySeqRef.current !== mySeq) return

        const ok = !!data.available
        memoryCache.set(cacheKey, ok)
        setAvailable(ok)
        setStatus(ok ? 'available' : 'taken')
      } catch {
        if (!ctrl.signal.aborted) {
          if (mySeqRef.current !== mySeq) return
          setStatus('error')
          setAvailable(null)
        }
      }
    })()

    // abort when username changes again
    return () => {
      ctrl.abort()
    }
  }, [sanitized, cacheKey])

  return { status, available, sanitized }
}
