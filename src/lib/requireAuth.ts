import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextAuthOptions'

export async function requireAuth(redirectTo: string) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect(`/admin/login?redirect=${encodeURIComponent(redirectTo)}`)
  }
  return session.user
}
