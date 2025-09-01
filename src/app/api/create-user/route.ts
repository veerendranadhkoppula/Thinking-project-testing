import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const payload = await getPayload({ config: configPromise })

  try {
    const body = await req.json()
    // Optional: Validate required fields
    const { email, password } = body
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 })
    }

    // Try to create the user
    const user = await payload.create({
      collection: 'site-users',
      data: body,
    })

    return NextResponse.json(user, { status: 201 })
  } catch (err: any) {
    console.error('[Signup error]', err)

    let message = 'Signup failed'
    let status = 500

    // Payload-specific error format (field-level validation, etc.)
    if (err.data?.errors?.[0]?.message) {
      message = err.data.errors[0].message
      status = err.status || 400
    } else if (err.message?.includes('duplicate key')) {
      message = 'A user with this email already exists.'
      status = 409
    }

    return NextResponse.json({ message }, { status })
  }
}
