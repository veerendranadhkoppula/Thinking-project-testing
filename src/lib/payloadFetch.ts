// lib/payloadFetch.ts
export async function payloadFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_PAYLOAD_API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error?.errors?.[0]?.message || 'Request failed')
  }

  return res.json()
}
