'use client'

import { useSession } from 'next-auth/react'

export default function WelcomePage() {
  const { data: session, status } = useSession()

  if (status === 'loading') return <p>Loading...</p>
  if (!session) return <p>You are not signed in</p>

  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold">Welcome, {session.user?.name}!</h1>
      <p className="text-gray-500">You’ve successfully signed in using Google.</p>
    </div>
  )
}
