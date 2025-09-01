'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import styles from './page.module.css'
import Link from 'next/link'

type Mode = 'login' | 'forgot'
type Action = 'idle' | 'login' | 'forgot' | 'guest' | 'google'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [identifier, setIdentifier] = useState('') // username or email
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [action, setAction] = useState<Action>('idle')
  const [cooldown, setCooldown] = useState(0) // seconds
  const router = useRouter()

  const isBusy = action !== 'idle'
  const isLoginBusy = action === 'login'
  const isForgotBusy = action === 'forgot'
  const isGuestBusy = action === 'guest'
  const isGoogleBusy = action === 'google'

  // tick down the cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isBusy) return // guard
    setError('')
    setInfo('')

    if (mode === 'forgot') {
      if (cooldown > 0) return
      try {
        setAction('forgot')
        const res = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: identifier }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data?.error || 'Failed to send reset email.')
          setCooldown(30)
          return
        }
        setInfo('Password reset email sent. Please check your inbox.')
        setCooldown(30)
      } catch {
        setError('Failed to send reset email.')
        setCooldown(30)
      } finally {
        setAction('idle')
      }
      return
    }

    // Login with credentials
    try {
      setAction('login')
      const res = await signIn('credentials', {
        email: identifier,
        password,
        redirect: false,
      })

      if (res?.ok) router.push('/')
      else setError(res?.error || 'Incorrect username/email or password.')
    } finally {
      setAction('idle')
    }
  }

  const handleGuestLogin = async () => {
    if (isBusy) return // guard
    setError('')
    setInfo('')
    try {
      setAction('guest')
      const res = await signIn('guest', { redirect: false })
      if (res?.ok) router.push('/')
      else setError(res?.error || 'Guest login failed.')
    } finally {
      setAction('idle')
    }
  }

  const handleGoogle = async () => {
    if (isBusy) return // guard
    setError('')
    setInfo('')
    setAction('google')
    // next-auth will redirect; no need to reset action afterward
    await signIn('google', { callbackUrl: '/' })
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleLogin} className={styles.form}>
        <h2 className={styles.title}>Welcome Back</h2>
        <p className={styles.subtitle}>
          {mode === 'login' ? 'Login with username or email' : 'Forgot your password?'}
        </p>

        <input
          type="text"
          placeholder="Username or Email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          className={styles.input}
          autoComplete={mode === 'login' ? 'username' : 'email'}
          disabled={isBusy && mode === 'login' ? isLoginBusy : isForgotBusy}
        />

        {mode === 'login' && (
          <>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
              autoComplete="current-password"
              disabled={isLoginBusy}
            />
            <button
              type="button"
              style={{ display: 'flex', justifyContent: 'flex-end' }}
              className={styles.link}
              onClick={() => {
                if (isBusy) return
                setMode('forgot')
                setError('')
                setInfo('')
                setCooldown(0)
              }}
            >
              Forgot password?
            </button>
          </>
        )}

        {error && <p className={styles.error}>{error}</p>}
        {info && <p className={styles.info}>{info}</p>}

        <button
          type="submit"
          className={styles.button}
          disabled={
            (mode === 'login' && isLoginBusy) ||
            (mode === 'forgot' && (isForgotBusy || cooldown > 0)) ||
            isGuestBusy ||
            isGoogleBusy
          }
        >
          {mode === 'login'
            ? isLoginBusy
              ? 'Logging in...'
              : 'Login'
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : isForgotBusy
                ? 'Sending reset link...'
                : 'Send Reset Email'}
        </button>

        {mode === 'login' && (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              className={styles.guestButton}
              disabled={isBusy}
              style={{ marginBottom: 0 }}
            >
              {isGoogleBusy ? 'Connecting to Google…' : 'Continue with Google'}
            </button>

            <button
              type="button"
              onClick={handleGuestLogin}
              className={styles.guestButton}
              disabled={isBusy}
            >
              {isGuestBusy ? 'Joining as Guest…' : 'Continue as Guest'}
            </button>
          </>
        )}

        <div className={styles.bottomRow}>
          <span>
            Don’t have an account?{' '}
            <Link href="/signup" className={styles.link}>
              Sign up
            </Link>
          </span>
        </div>
      </form>
    </div>
  )
}
