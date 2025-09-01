'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import styles from './Profile.module.css'
import { Eye, EyeOff } from 'lucide-react'

type LocalUser = {
  email?: string
  username?: string
}

export default function ProfilePage() {
  const { data: session, status } = useSession()

  const user: LocalUser | null = session?.user
    ? {
        email: session.user.email ?? undefined,
        username:
          session.user.name ?? (session.user.email ? session.user.email.split('@')[0] : undefined),
      }
    : null

  const [form, setForm] = useState({ currentPassword: '', newPassword: '' })
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handlePasswordChange = async () => {
    if (!form.newPassword) {
      setMessage('Please fill both fields')
      return
    }
    setSubmitting(true)
    setMessage('')

    try {
      const res = await fetch('/api/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: form.newPassword,
        }),
      })
      const data = await res.json()
      setMessage(res.ok ? data.message || 'Password updated' : data.error || 'Failed')
    } catch (err: any) {
      setMessage(err?.message || 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') return <p>Loading...</p>
  if (!user) return <p>Please sign in to view your profile.</p>

  const initials = (() => {
    const source = user.username || user.email || ''
    const parts = source.trim().split(/\s+/)
    if (parts.length > 1)
      return parts
        .map((p) => p[0])
        .join('')
        .toUpperCase()
    return source.trim().charAt(0).toUpperCase() || '👤'
  })()

  return (
    <div className={styles.container}>
      <div className={styles.avatar}>{initials}</div>

      <div className={styles.field}>
        <label>Full Name</label>
        <input type="text" value={user.username || ''} readOnly />
      </div>

      <div className={styles.field}>
        <label>Email</label>
        <input type="email" value={user.email || ''} readOnly />
      </div>

      <div className={styles.field}>
        <label>New Password</label>
        <input
          type="password"
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
        />
      </div>
      <button className={styles.btn} onClick={handlePasswordChange} disabled={submitting}>
        {submitting ? 'Updating…' : 'Change Password'}
      </button>
      {message && <p className={styles.message}>{message}</p>}
    </div>
  )
}
