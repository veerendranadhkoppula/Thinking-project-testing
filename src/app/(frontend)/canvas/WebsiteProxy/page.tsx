// app/(frontend)/[WebsiteProxy]/page.tsx
import configPromise from '@/payload.config'
import payload from 'payload'
import { notFound } from 'next/navigation'
import { Website } from '@/payload-types'
import { isLatestVersion } from '../helper/isLatestVersion'
import ClientWebsiteProxy from './ClientWebsiteProxy'

import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextAuthOptions'
import GuestEmailGate from '../components/GuestEmailGate'
import AccessDenied from '@/components/AccessDenied'

export const dynamic = 'force-dynamic'

type SearchParams = {
  id?: string | string[]
  version?: string | string[]
}

export default async function WebsiteProxy(props: any) {
  // Cast safely here
  const params = (await props.params) as { WebsiteProxy: string }
  const searchParams = (await props.searchParams) as SearchParams

  const { id: idParam, version: versionParam } = searchParams
  const websiteId = Array.isArray(idParam) ? idParam[0] : idParam
  const versionStr = Array.isArray(versionParam) ? versionParam[0] : versionParam
  const versionIdx = Math.max(0, (Number(versionStr) || 1) - 1)

  const config = await configPromise
  await payload.init({ config })

  let websiteData: Website | null = null
  if (websiteId) {
    try {
      websiteData = await payload.findByID({
        collection: 'Website',
        id: websiteId,
      })
    } catch (err) {
      console.error('Error fetching Website:', err)
    }
  }
  if (!websiteData) return notFound()

  // ---- ACCESS GATE ----
  const jar = await cookies()
  const guestCookie = jar.get(`guest:${websiteId}`)?.value

  const lowerGuests = websiteData.guests?.map((g) => g.guest?.toLowerCase()).filter(Boolean) ?? []
  const lowerAdmins = websiteData.admins?.map((a) => a.admin?.toLowerCase()).filter(Boolean) ?? []
  const lowerEditors =
    websiteData.editors?.map((e) => e.editor?.toLowerCase()).filter(Boolean) ?? []

  const session = (await getServerSession(authOptions)) as {
    user?: { email?: string | null }
  } | null
  const sessionEmail = session?.user?.email?.toLowerCase()
  const sessionAllowed =
    !!sessionEmail &&
    (lowerAdmins.includes(sessionEmail) ||
      lowerEditors.includes(sessionEmail) ||
      lowerGuests.includes(sessionEmail))

  if (!sessionAllowed) {
    if (guestCookie !== '1') {
      return <GuestEmailGate websiteId={websiteId!} versionStr={versionStr ?? null} />
    }
  }
  // ---- END ACCESS GATE ----

  const versionsArr = websiteData.versions ?? []
  if (!versionsArr[versionIdx]) {
    console.warn('Invalid version index, falling back to latest')
    if (versionsArr.length === 0) return notFound()
  }

  const safeVersionIdx = versionsArr[versionIdx] ? versionIdx : Math.max(0, versionsArr.length - 1)
  const activeVersion = versionsArr[safeVersionIdx]

  const threads =
    (activeVersion?.['page-links'] ?? [])
      .flatMap((pl: any) =>
        (pl?.thread ?? []).map((t: any) => ({
          ...t,
          pageUrl: pl['page-link'],
        })),
      )
      .filter(Boolean) ?? []

  const firstPageLink =
    (activeVersion?.['page-links'] ?? []).find(
      (pl: any) => typeof pl?.['page-link'] === 'string',
    )?.['page-link'] ||
    websiteData.url ||
    ''

  const latest = await isLatestVersion(
    websiteId as string,
    ((safeVersionIdx + 1) as number).toString(),
  )

  return (
    <ClientWebsiteProxy
      websiteData={websiteData}
      versionsArr={versionsArr}
      safeVersionIdx={safeVersionIdx}
      threads={threads}
      firstPageLink={firstPageLink}
      websiteId={websiteId as string}
      latest={latest}
    />
  )
}
