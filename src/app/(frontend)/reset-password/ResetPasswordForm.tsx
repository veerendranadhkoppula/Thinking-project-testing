'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function ResetPasswordForm() {
  const searchParams = useSearchParams()!
  const router = useRouter()
  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!token || !email) {
      setError('Missing token or email')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      })

      const data = await res.json()
      setLoading(false)

      if (res.ok) {
        setMessage('Password reset successful! You can now log in.')
        setTimeout(() => router.push('/login'), 2000)
      } else {
        setError(data.message || 'Error resetting password')
      }
    } catch {
      setLoading(false)
      setError('Unexpected error')
    }
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2 className={styles.title}>Reset Password</h2>
        <p className={styles.subtitle}>Please enter your new password below</p>

        <input
          type="password"
          placeholder="New Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          autoComplete="new-password"
        />

        <input
          type="password"
          placeholder="Confirm Password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={styles.input}
          autoComplete="new-password"
        />

        {error && <p className={styles.error}>{error}</p>}
        {message && <p className={styles.info}>{message}</p>}

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  )
}
