// Works on Node/Edge to build absolute URLs for server-side fetch.
import { headers } from 'next/headers'

export async function getServerOrigin() {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') || 'http'
  const host = h.get('x-forwarded-host') || h.get('host')
  if (host) return `${proto}://${host}`
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  return 'http://localhost:3000'
}
