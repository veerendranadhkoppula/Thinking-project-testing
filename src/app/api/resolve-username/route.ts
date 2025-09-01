// app/api/resolve-username/route.ts
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const dynamic = 'force-dynamic' // no static caching
export const runtime = 'nodejs' // required for payload server SDK

export async function POST(req: Request) {
  try {
    const { name } = await req.json()
    const trimmed = String(name || '').trim()
    if (!trimmed) {
      return NextResponse.json({ found: false, reason: 'empty' })
    }

    const payload = await getPayload({ config: configPromise })
    const anchored = `^${escapeRegExp(trimmed)}$`

    // Stage 1: CI exact match via regex
    const exact = await payload.find({
      collection: 'site-users',
      where: { name: { like: anchored } },
      limit: 1,
      depth: 0,
    })
    if (exact?.docs?.[0]?.email) {
      return NextResponse.json({ found: true, email: exact.docs[0].email })
    }

    // Stage 2: broad LIKE then JS filter for exact CI
    const nearby = await payload.find({
      collection: 'site-users',
      where: { name: { like: trimmed } },
      limit: 25,
      depth: 0,
    })
    const docs = Array.isArray(nearby?.docs) ? nearby.docs : []
    const match = docs.find(
      (d) =>
        typeof d?.name === 'string' &&
        d.name.localeCompare(trimmed, undefined, { sensitivity: 'accent' }) === 0,
    )

    if (match?.email) return NextResponse.json({ found: true, email: match.email })
    return NextResponse.json({ found: false })
  } catch (e) {
    // Keep 200 to avoid noisy 404/500 in NextAuth logs; report failure explicitly
    return NextResponse.json({ found: false, error: 'lookup_failed' })
  }
}
