import { Website } from '@/payload-types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextAuthOptions'

type SessionUser = { email?: string | null }

export async function checkCanvasViewerAccess(website: Website, guestEmailParam?: string) {
  // First, check logged-in user (admins/editors)
  const session = (await getServerSession(authOptions)) as { user?: SessionUser } | null
  const email = session?.user?.email?.toLowerCase()

  const admins = website.admins?.map((a) => a.admin?.toLowerCase()).filter(Boolean) ?? []
  const editors = website.editors?.map((e) => e.editor?.toLowerCase()).filter(Boolean) ?? []
  const guests = website.guests?.map((g) => g.guest?.toLowerCase()).filter(Boolean) ?? []

  if (email && (admins.includes(email) || editors.includes(email))) {
    return { allowed: true, role: 'member', email }
  }

  // Next, check guestEmail from link
  const guestEmail = guestEmailParam?.toLowerCase()
  if (guestEmail && guests.includes(guestEmail)) {
    return { allowed: true, role: 'guest', email: guestEmail }
  }

  return { allowed: false, role: null, email: email || guestEmail }
}
