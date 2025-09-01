// app/api/username-available/route.ts
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'

const COLLECTION = 'site-users' // ← your collection
const USERNAME_FIELD = 'name' // ← your username field

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sanitizeInput(s: string) {
  return (s || '')
    .trim()
    .replace(/[^A-Za-z0-9_.-]+/g, '')
    .slice(0, 30) // ← start at 0
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const raw = (searchParams.get('username') || '').trim()
    const username = sanitizeInput(raw)
    if (!username) {
      return NextResponse.json(
        { available: false, reason: 'empty' },
        { headers: { 'cache-control': 'no-store' } },
      )
    }

    const payload = await getPayload({ config: configPromise })

    // --- Stage 1: Case-insensitive EXACT via anchored regex ---
    // Works on Mongo (and some adapters that honor { like, options:'i' }).
    const anchored = `^${escapeRegExp(username)}$`

    const exact = await payload.find({
      collection: COLLECTION,
      where: { [USERNAME_FIELD]: { like: anchored } },
      limit: 1,
      depth: 0,
    })

    if (Array.isArray(exact?.docs) && exact.docs.length > 0) {
      return NextResponse.json(
        { available: false, normalized: username },
        { headers: { 'cache-control': 'no-store' } },
      )
    }

    // --- Stage 2: Fallback — broader LIKE, then JS filter for exact CI ---
    // Handles adapters that ignore 'options' or treat LIKE as case-sensitive.
    const nearby = await payload.find({
      collection: COLLECTION,
      where: { [USERNAME_FIELD]: { like: username } }, // broad search
      limit: 25,
      depth: 0,
    })

    const list = Array.isArray(nearby?.docs) ? nearby.docs : []
    const hasExactCaseInsensitive = list.some((d) => {
      const val = d?.[USERNAME_FIELD]
      return (
        typeof val === 'string' &&
        val.localeCompare(username, undefined, { sensitivity: 'accent' }) === 0
      )
      // equivalently: val.toLowerCase() === username.toLowerCase()
    })

    return NextResponse.json(
      { available: !hasExactCaseInsensitive, normalized: username },
      { headers: { 'cache-control': 'no-store' } },
    )
  } catch {
    // Safer default to avoid duplicates on transient errors
    return NextResponse.json(
      { available: false, error: 'lookup_failed' },
      { status: 200, headers: { 'cache-control': 'no-store' } },
    )
  }
}
