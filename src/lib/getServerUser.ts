import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextAuthOptions'

export async function getServerUser(): Promise<any | null> {
  const session = await getServerSession(authOptions)
  const user: any | null = session?.user
    ? {
        email: session.user.email ?? undefined,
        username:
          session.user.name ?? (session.user.email ? session.user.email.split('@')[0] : undefined),
      }
    : null

  return user
}
