import configPromise from '@/payload.config'
import payload, { CollectionSlug } from 'payload'
import Client_CanvasSettings from './Client_CanvasSettings'
import { getServerUser } from '@/lib/getServerUser'
import { notFound } from 'next/navigation'
// import { type PageProps } from 'next' // if you want, but not strictly needed
export const dynamic = 'force-dynamic'

type AdminRow = { admin: string }
type EditorRow = { editor: string }
type GuestRow = { guest: string }
type ViewportRow = { label: string; x: number; y: number }

function has<T extends string>(k: T) {
  return (x: unknown): x is Record<T, unknown> => !!x && typeof x === 'object' && k in (x as any)
}

const hasAdmins = has('admins')
const hasEditors = has('editors')
const hasGuests = has('guests')
const hasViewports = has('viewports')
const hasVersions = has('versions')
const hasTypeGroup = has('type')

async function GetCanvasData({
  searchParams,
}: {
  searchParams: { [k: string]: string | string[] | undefined }
}) {
  const { id, version, type, injection } = searchParams
  if (!id || !type) return null

  // who is viewing?
  const user = await getServerUser()
  const viewerEmail = user?.email?.toLowerCase() ?? ''

  const config = await configPromise
  if (!payload.db) await payload.init({ config })

  const documentData = await payload
    .findByID({
      collection: type as CollectionSlug,
      id: String(id),
    })
    .catch(() => null)
  if (!documentData) notFound()

  // admin check
  const admins: AdminRow[] = hasAdmins(documentData)
    ? ((documentData.admins as AdminRow[]) ?? [])
    : []
  const isAdmin = admins.some((a) => a?.admin?.toLowerCase?.() === viewerEmail)
  if (!isAdmin) {
    notFound()
  }

  const editors: EditorRow[] = hasEditors(documentData)
    ? ((documentData.editors as EditorRow[]) ?? [])
    : []
  const guests: GuestRow[] = hasGuests(documentData)
    ? ((documentData.guests as GuestRow[]) ?? [])
    : []
  const viewports: ViewportRow[] = hasViewports(documentData)
    ? ((documentData.viewports as ViewportRow[]) ?? [])
    : []

  const versionsLen =
    hasVersions(documentData) && Array.isArray((documentData as any).versions)
      ? (documentData as any).versions.length
      : 0
  const versions: number[] = Array.from({ length: versionsLen }, (_, i) => i + 1)

  let mediaType = 'Website'
  let injectionType = ''
  if (hasTypeGroup(documentData)) {
    mediaType = (documentData as any)?.type?.mediaType || mediaType
    injectionType = (documentData as any)?.type?.injectionType || ''
  }
  const mediaPathSegment = `${mediaType}${injectionType || ''}`

  return {
    id,
    type,
    version,
    injection,
    editors,
    guests,
    viewports,
    versions,
    mediaType,
    mediaPathSegment,
    isAdmin, // pass down to client, too
    documentData,
  }
}

export default async function CanvasSettings({
  searchParams,
}: {
  searchParams?: { [k: string]: string | string[] | undefined }
}) {
  const data = await GetCanvasData({ searchParams: searchParams ?? {} })
  return <Client_CanvasSettings data={data} />
}
