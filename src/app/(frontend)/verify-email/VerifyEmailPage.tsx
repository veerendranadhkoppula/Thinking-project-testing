'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()!
  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''

  const [password, setPassword] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sessionPassword = sessionStorage.getItem('password')
    if (sessionPassword) setPassword(sessionPassword)
  }, [])

  useEffect(() => {
    const verifyAndMaybeLogin = async () => {
      if (!token) return
      try {
        setLoading(true)
        const verifyRes = await fetch('/api/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        if (!verifyRes.ok) throw new Error('Verification failed')
        setVerified(true)

        if (email && password) {
          const loginRes = await fetch('/api/manual-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
          if (!loginRes.ok) throw new Error('Auto-login failed')

          sessionStorage.removeItem('email')
          sessionStorage.removeItem('password')

          router.push('/welcome')
        }
      } catch (err) {
        console.error(err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    verifyAndMaybeLogin()
  }, [token, email, password, router])

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <h2 className={styles.title}>Verify Email</h2>
        <p className={styles.subtitle}>We’re confirming your account</p>

        {loading && <p className={styles.info}>Verifying your email…</p>}
        {!loading && error && (
          <p className={styles.error}>Verification failed. Please try again or contact support.</p>
        )}
        {!loading && verified && !password && (
          <>
            <p className={styles.info}>Email verified successfully!</p>
            <p className={styles.subtitle}>
              Please{' '}
              <Link href="/login" className={styles.link}>
                log in
              </Link>{' '}
              to continue.
            </p>
          </>
        )}
        {!loading && error && (
          <div style={{ marginTop: 12 }}>
            <Link href="/login" className={styles.link}>
              Go to login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
