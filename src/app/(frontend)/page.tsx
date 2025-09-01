import Navbar from '@/app/(frontend)/components/Home/Navbar/Navbar'
// import ChatWidget from '@/app/(frontend)/components/Home/Navbar/ChatWidget'
import DashBoard from '@/app/(frontend)/components/Home/DashBoard/DashBoard'
import { getServerUser } from '@/lib/getServerUser'
import ClientHomeMounted from './components/Home/ClientHomeMounted'

const payloadURL = process.env.NEXT_PUBLIC_PAYLOAD_API as string
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function getUserCanvases(user: { email?: string | undefined } | null) {
  if (!user?.email) {
    throw new Error('User not authenticated')
  }
  const res = await fetch(
    `${payloadURL}/canvas-created-with-emails?where[email][equals]=${encodeURIComponent(
      user.email,
    )}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
  if (!res.ok) {
    throw new Error(`Failed to fetch canvases for ${user.email}`)
  }
  const data = await res.json()
  const doc = data?.docs?.[0]
  return doc?.canvases ?? []
}

export default async function HomePage() {
  const user = await getServerUser()
  let dashboardData = []
  if (user) {
    const canvases = await getUserCanvases(user)
    dashboardData = canvases.map((c: any) => {
      const mediaType = c.value.type?.mediaType || c.relationTo || 'unknown'
      const injectionType = c.value.type?.injectionType || 'Default'
      const versions = c.value.versions || []
      const latestVersion = versions.length > 0 ? versions.length : 1
      const admins = Array.isArray(c.value.admins) ? c.value.admins : []
      const isAdmin = admins.some((a: any) => a?.admin === user.email)

      return {
        id: c.value.id,
        title: c.value.title,
        category: mediaType,
        url: c.value.url,
        href: `canvas/${mediaType}${injectionType}?id=${c.value.id}&version=${latestVersion}`,
        settingsHref: isAdmin
          ? `/canvas-setting/?id=${c.value.id}&version=${latestVersion}&type=${mediaType}&injection=${injectionType}`
          : null,
        isAdmin,
      }
    })
  }

  return (
    <>
      <ClientHomeMounted />
      <Navbar user={user} />
      <DashBoard data={dashboardData} userData={user} />
      {/* <ChatWidget userName={user?.username} /> */}
    </>
  )
}
