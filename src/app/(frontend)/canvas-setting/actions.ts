// src/app/canvas-setting/actions.ts
'use server'

import payload, { CollectionSlug } from 'payload'
import configPromise from '@/payload.config'
import { revalidatePath } from 'next/cache'
import { getServerUser } from '@/lib/getServerUser'

async function ensurePayload() {
  const config = await configPromise
  if (!payload.db) await payload.init({ config })
}

async function ensureCollectionSlug(s: string): Promise<CollectionSlug> {
  const config = await configPromise
  const slugs = (config.collections ?? []).map((c) => c.slug) as CollectionSlug[]
  if (slugs.includes(s as CollectionSlug)) return s as CollectionSlug
  throw new Error(`Invalid collection slug: ${s}`)
}

type Id = { type: string; id: string }
type AdminRow = { admin: string }

async function requireAdminOnDoc({
  type,
  id,
}: Id): Promise<{ collection: CollectionSlug; userEmail: string }> {
  await ensurePayload()
  const collection = await ensureCollectionSlug(type)
  const user = await getServerUser()
  const email = user?.email?.toLowerCase()
  if (!email) throw new Error('Unauthorized')

  const doc: any = await payload.findByID({ collection, id })
  const admins: AdminRow[] = Array.isArray(doc?.admins) ? doc.admins : []
  const isAdmin = admins.some((a) => a?.admin?.toLowerCase?.() === email)
  if (!isAdmin) throw new Error('Forbidden')
  return { collection, userEmail: email }
}

// -------- helpers --------
type EditorRow = { editor: string }
type GuestRow = { guest: string }
type ViewportRow = { label: string; x: number; y: number }
type VersionRow = {
  ['page-links']: Array<{ ['page-link']: string; roomId: string; thread: any[] }>
}

const norm = (s: string) => s.trim().toLowerCase()
const has =
  <T extends string>(k: T) =>
  (x: unknown): x is Record<T, unknown> =>
    !!x && typeof x === 'object' && k in (x as any)
const hasEditors = has('editors')
const hasGuests = has('guests')
const hasViewports = has('viewports')
const hasVersions = has('versions')

// Upsert relation in canvas-created-with-emails for a given email + canvas ref
async function upsertCanvasRefForEmail(emailRaw: string, relationTo: string, valueId: string) {
  const email = norm(emailRaw)
  if (!email || !relationTo || !valueId) return

  // --- current schema supports ONLY 'Website' -------------
  if (relationTo !== 'Website') {
    // If you plan to support more collections, first change the schema (see note below).
    // For now, do nothing for other collections to keep types correct.
    return
  }

  // Website expects number | Website; pass numeric id
  const websiteIdNum = Number(valueId)
  if (!Number.isFinite(websiteIdNum)) {
    throw new Error(`Website id must be numeric, received: ${valueId}`)
  }

  // Strongly-typed relation item
  const newRel: { relationTo: 'Website'; value: number } = {
    relationTo: 'Website',
    value: websiteIdNum,
  }

  // 1) find existing bucket
  const found = await payload.find({
    collection: 'canvas-created-with-emails',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  // Key for de-dupe (handles both numeric value and populated object cases)
  const toKey = (x: any) =>
    x && x.relationTo && x.value != null
      ? `${x.relationTo}::${typeof x.value === 'object' && x.value.id != null ? x.value.id : x.value}`
      : ''

  if (found?.docs?.length) {
    const bucket = found.docs[0] as any
    const current = Array.isArray(bucket.canvases) ? bucket.canvases : []
    const keys = new Set(current.map(toKey).filter(Boolean))
    if (!keys.has(toKey(newRel))) current.push(newRel)

    await payload.update({
      collection: 'canvas-created-with-emails',
      id: bucket.id,
      data: { canvases: current },
      depth: 0,
      overrideAccess: true,
    })
  } else {
    await payload.create({
      collection: 'canvas-created-with-emails',
      data: { email, canvases: [newRel] },
      depth: 0,
      overrideAccess: true,
    })
  }
}

// ------------ EDITORS ------------
export async function listEditors({ type, id }: Id) {
  const { collection } = await requireAdminOnDoc({ type, id })
  const doc = await payload.findByID({ collection, id })
  return hasEditors(doc) ? ((doc.editors as EditorRow[]) ?? []) : []
}

export async function addEditorAction({ type, id }: Id, emailRaw: string) {
  const { collection } = await requireAdminOnDoc({ type, id })
  const email = norm(emailRaw)
  if (!email) return { ok: false, error: 'Email required' }

  const doc = await payload.findByID({ collection, id })
  const current: EditorRow[] = hasEditors(doc) ? ((doc.editors as EditorRow[]) ?? []) : []
  if (current.some((e) => norm(e.editor) === email)) {
    // still ensure canvas ref exists in the mapping
    await upsertCanvasRefForEmail(email, collection, id)
    return { ok: true, editors: current }
  }

  const updated = await payload.update({
    collection,
    id,
    data: { editors: [...current, { editor: email }] },
  })

  // upsert mapping for the newly added editor
  await upsertCanvasRefForEmail(email, collection, id)

  revalidatePath('/canvas-setting', 'page')
  return { ok: true, editors: hasEditors(updated) ? ((updated.editors as EditorRow[]) ?? []) : [] }
}

export async function deleteEditorAction({ type, id }: Id, emailRaw: string) {
  const { collection } = await requireAdminOnDoc({ type, id })
  const email = norm(emailRaw)
  if (!email) return { ok: false, error: 'Email required' }

  const doc = await payload.findByID({ collection, id })
  const current: EditorRow[] = hasEditors(doc) ? ((doc.editors as EditorRow[]) ?? []) : []
  const next = current.filter((e) => norm(e.editor) !== email)

  const updated = await payload.update({ collection, id, data: { editors: next } })
  // NOTE: spec asks only to add on add; not removing mapping on delete. Keep as is.
  revalidatePath('/canvas-setting', 'page')
  return { ok: true, editors: hasEditors(updated) ? ((updated.editors as EditorRow[]) ?? []) : [] }
}

// ------------ GUESTS ------------
export async function listGuests({ type, id }: Id) {
  const { collection } = await requireAdminOnDoc({ type, id })
  const doc = await payload.findByID({ collection, id })
  return hasGuests(doc) ? ((doc.guests as GuestRow[]) ?? []) : []
}

export async function addGuestAction({ type, id }: Id, guestRaw: string) {
  const { collection } = await requireAdminOnDoc({ type, id })
  const guest = norm(guestRaw)
  if (!guest) return { ok: false, error: 'Guest required' }

  const doc = await payload.findByID({ collection, id })
  const current: GuestRow[] = hasGuests(doc) ? ((doc.guests as GuestRow[]) ?? []) : []
  if (current.some((g) => norm(g.guest) === guest)) {
    // ensure mapping exists even if already in array
    await upsertCanvasRefForEmail(guest, collection, id)
    return { ok: true, guests: current }
  }

  const updated = await payload.update({
    collection,
    id,
    data: { guests: [...current, { guest }] },
  })

  // upsert mapping for the newly added guest
  await upsertCanvasRefForEmail(guest, collection, id)

  revalidatePath('/canvas-setting', 'page')
  return { ok: true, guests: hasGuests(updated) ? ((updated.guests as GuestRow[]) ?? []) : [] }
}

export async function deleteGuestAction({ type, id }: Id, guestRaw: string) {
  const { collection } = await requireAdminOnDoc({ type, id })
  const guest = norm(guestRaw)
  if (!guest) return { ok: false, error: 'Guest required' }

  const doc = await payload.findByID({ collection, id })
  const current: GuestRow[] = hasGuests(doc) ? ((doc.guests as GuestRow[]) ?? []) : []
  const next = current.filter((g) => norm(g.guest) !== guest)

  const updated = await payload.update({ collection, id, data: { guests: next } })
  // NOTE: not removing mapping on delete (matches your ask). If you want removal, say so.
  revalidatePath('/canvas-setting', 'page')
  return { ok: true, guests: hasGuests(updated) ? ((updated.guests as GuestRow[]) ?? []) : [] }
}

// ------------ VIEWPORTS ------------
export async function listViewports({ type, id }: Id) {
  const { collection } = await requireAdminOnDoc({ type, id })
  const doc = await payload.findByID({ collection, id })
  return hasViewports(doc) ? ((doc.viewports as ViewportRow[]) ?? []) : []
}

export async function addViewportAction({ type, id }: Id, vp: ViewportRow) {
  const { collection } = await requireAdminOnDoc({ type, id })
  const doc = await payload.findByID({ collection, id })
  const current: ViewportRow[] = hasViewports(doc) ? ((doc.viewports as ViewportRow[]) ?? []) : []

  const updated = await payload.update({ collection, id, data: { viewports: [...current, vp] } })
  revalidatePath('/canvas-setting', 'page')
  return {
    ok: true,
    viewports: hasViewports(updated) ? ((updated.viewports as ViewportRow[]) ?? []) : [],
  }
}

export async function deleteViewportAction({ type, id }: Id, label: string) {
  const { collection } = await requireAdminOnDoc({ type, id })
  const doc = await payload.findByID({ collection, id })
  const current: ViewportRow[] = hasViewports(doc) ? ((doc.viewports as ViewportRow[]) ?? []) : []
  const next = current.filter((v) => v.label !== label)

  const updated = await payload.update({ collection, id, data: { viewports: next } })
  revalidatePath('/canvas-setting', 'page')
  return {
    ok: true,
    viewports: hasViewports(updated) ? ((updated.viewports as ViewportRow[]) ?? []) : [],
  }
}

// ------------ VERSIONS ------------
function computeReadableRoomId(adminEmail: string, rawUrl: string, versionIndex: number) {
  const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`)
  return `${adminEmail}/${parsed.host}/#${versionIndex}`
}

export async function createVersionAction({ type, id }: Id, { url }: { url?: string }) {
  const { collection } = await requireAdminOnDoc({ type, id })

  const doc: any = await payload.findByID({ collection, id })
  const current: VersionRow[] = hasVersions(doc) ? ((doc.versions as VersionRow[]) ?? []) : []

  const adminEmail: string | undefined = Array.isArray(doc?.admins)
    ? doc.admins[0]?.admin
    : undefined
  const pageUrl: string | undefined = (url ?? doc?.url)?.trim()
  if (!adminEmail) return { ok: false, error: 'Missing admin email on document' }
  if (!pageUrl) return { ok: false, error: 'Missing URL: pass one or set doc.url' }

  const nextIndex = current.length + 1
  const roomId = computeReadableRoomId(adminEmail, pageUrl, nextIndex)

  const newVersion: VersionRow = {
    ['page-links']: [{ ['page-link']: pageUrl, roomId, thread: [] }],
  }
  const updated = await payload.update({
    collection,
    id,
    data: { versions: [...current, newVersion] },
  })

  revalidatePath('/canvas-setting', 'page')
  const total =
    hasVersions(updated) && Array.isArray((updated as any).versions)
      ? (updated as any).versions.length
      : nextIndex
  return { ok: true, versionsCount: total }
}
