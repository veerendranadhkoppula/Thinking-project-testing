import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'

type Body = {
  email: string
  title: string
  type: 'Website' | 'Figma' | 'Image' | 'PDF' | 'Video'
  websiteType?: 'Proxy' | 'Manual' | 'Extension'
  extraField?: string // URL
}

function cleanUrl(u?: string): string {
  const raw = (u || '').trim()
  if (!raw) return ''
  try {
    const hasProto = /^https?:\/\//i.test(raw)
    const normalized = new URL(hasProto ? raw : `https://${raw}`)
    return normalized.toString()
  } catch {
    return ''
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    const { email, title, type, websiteType, extraField } = body

    if (type !== 'Website') {
      return NextResponse.json(
        { ok: false, error: 'Only Website is supported in this route' },
        { status: 400 },
      )
    }

    const url = cleanUrl(extraField)
    if (!email?.trim() || !title?.trim() || !url) {
      return NextResponse.json(
        { ok: false, error: 'email, title, and a valid URL are required' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config: configPromise })

    // 1) Create website canvas
    const created = await payload.create({
      collection: 'Website',
      overrideAccess: true,
      data: {
        title: title.trim(),
        url,
        admins: [{ admin: email.trim() }],
        type: { mediaType: 'Website', injectionType: websiteType ?? 'Proxy' },
      },
      depth: 0,
    })

    const websiteId = created.id // pass through as-is, no numeric coercion

    // 2) Upsert into canvas-created-with-emails (polymorphic array)
    const found = await payload.find({
      collection: 'canvas-created-with-emails',
      where: { email: { equals: email.trim() } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const newRel = { relationTo: 'Website' as const, value: websiteId }

    if (found?.docs?.length) {
      const bucket = found.docs[0]
      const current = Array.isArray(bucket.canvases) ? bucket.canvases : []

      const toKey = (x: any) =>
        x && x.relationTo && x.value != null
          ? `${x.relationTo}::${typeof x.value === 'object' && x.value.id != null ? x.value.id : x.value}`
          : ''

      const exists = new Set(current.map(toKey).filter(Boolean))
      if (!exists.has(toKey(newRel))) current.push(newRel)

      await payload.update({
        collection: 'canvas-created-with-emails',
        id: bucket.id as any,
        data: { canvases: current },
        depth: 0,
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'canvas-created-with-emails',
        data: {
          email: email.trim(),
          canvases: [newRel],
        },
        depth: 0,
        overrideAccess: true,
      })
    }

    return NextResponse.json({ ok: true, id: websiteId })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'unexpected_error' },
      { status: 500 },
    )
  }
}
