'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { verifyGuestAccessAction } from '../helper/actions'

export default function GuestEmailGate({
  websiteId,
  versionStr,
}: {
  websiteId: string
  versionStr?: string | null
}) {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [isPending, start] = useTransition()
  const router = useRouter()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    const v = email.trim().toLowerCase()
    if (!v) return

    start(async () => {
      const res = await verifyGuestAccessAction({ id: websiteId, email: v })
      if (!res.ok) {
        setErr(res.error || 'Not authorized')
        return
      }
      // Refresh/replace to render the actual canvas (clean URL, no params added)
      const clean = versionStr
        ? `/canvas/WebsiteProxy?id=${encodeURIComponent(websiteId)}&version=${encodeURIComponent(
            versionStr,
          )}`
        : `/canvas/WebsiteProxy?id=${encodeURIComponent(websiteId)}`
      router.replace(clean)
    })
  }

  return (
    <div className="min-h-screen grid place-items-center p-8">
      <form
        onSubmit={onSubmit}
        className="max-w-md w-full border rounded-2xl p-6 shadow-sm bg-white"
      >
        <h1 className="text-lg font-semibold">Enter your guest email</h1>
        <p className="text-sm opacity-80 mt-1">
          Access is restricted. Enter the email the admin added for you.
        </p>

        <input
          type="email"
          placeholder="guest@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-4 w-full rounded-xl border px-3 py-2"
        />

        {err && <div className="text-red-600 text-sm mt-2">{err}</div>}

        <button
          type="submit"
          disabled={isPending || !email.trim()}
          className="mt-4 px-4 py-2 rounded-xl border shadow-sm bg-white hover:bg-gray-50"
        >
          {isPending ? 'Verifying…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
