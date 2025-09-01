// app/(auth)/signup/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import Link from 'next/link'
import { useUsernameAvailability } from '@/hooks/useUsernameAvailability'

export default function SignupPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const { status, available, sanitized } = useUsernameAvailability(username)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setInfoMessage('')

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match!')
      return
    }
    if (!sanitized) {
      setErrorMessage('Username is required')
      return
    }
    if (available === false) {
      setErrorMessage('That username is taken')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: username }),
      })
      const txt = await res.text()
      let data: any = {}
      try {
        data = txt ? JSON.parse(txt) : {}
      } catch {}
      setLoading(false)

      if (!res.ok) {
        setErrorMessage(data?.message || 'Signup failed')
        return
      }

      setInfoMessage('Signup successful! Please verify your email.')
      setTimeout(() => router.push('/login'), 1200)
    } catch {
      setLoading(false)
      setErrorMessage('Signup failed')
    }
  }

  const helper =
    status === 'checking'
      ? 'Checking availability…'
      : status === 'taken'
        ? 'Username is taken'
        : status === 'available'
          ? 'Username is available'
          : ''

  return (
    <div className={styles.container}>
      <form onSubmit={handleSignup} className={styles.form}>
        <h2 className={styles.title}>Create an Account</h2>
        <p className={styles.subtitle}>Join us by entering your details</p>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className={styles.input}
          autoComplete="username"
        />
        {helper && (
          <p
            className={
              status === 'available'
                ? styles.infoUserName
                : status === 'taken'
                  ? styles.errorUserName
                  : styles.subtitleUserName
            }
            style={{ marginTop: -8 }}
          >
            {helper}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={styles.input}
          autoComplete="email"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={styles.input}
          autoComplete="new-password"
        />

        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className={styles.input}
          autoComplete="new-password"
        />

        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
        {infoMessage && <p className={styles.info}>{infoMessage}</p>}

        <button
          type="submit"
          className={styles.button}
          disabled={loading || status === 'checking' || available === false}
        >
          {loading ? 'Creating account…' : 'Sign Up'}
        </button>

        <p className={styles.bottomText}>
          Already have an account?{' '}
          <Link href="/login" className={styles.link}>
            Login
          </Link>
        </p>
      </form>
    </div>
  )
}
