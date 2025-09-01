'use server'

import { cookies } from 'next/headers'
import payload from 'payload'
import configPromise from '@/payload.config'

export async function verifyGuestAccessAction(args: { id: string; email: string }) {
  const { id, email } = args
  if (!id || !email) return { ok: false, error: 'Missing id or email' }

  const config = await configPromise
  await payload.init({ config })

  const website = await payload.findByID({
    collection: 'Website',
    id,
  })

  const lowerGuests =
    website?.guests?.map((g: any) => g?.guest?.toLowerCase()).filter(Boolean) ?? []

  const ok = lowerGuests.includes(email.toLowerCase())
  if (!ok) return { ok: false, error: 'Email not authorized' }

  const jar = await cookies()
  jar.set({
    name: `guest:${id}`,
    value: '1',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  return { ok: true }
}
