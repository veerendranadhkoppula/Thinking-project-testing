import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import crypto from 'crypto'

// Replace this with your actual frontend URL for the reset password page
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'

export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })

  try {
    // Find user by email
    const users = await payload.find({
      collection: 'site-users',
      where: {
        email: {
          equals: email,
        },
      },
      limit: 1,
    })

    if (users.docs.length === 0) {
      // To avoid revealing user existence, respond with success anyway
      return NextResponse.json({ success: true })
    }

    const user = users.docs[0]

    // Generate a secure random token (40 chars hex)
    const resetToken = crypto.randomBytes(20).toString('hex')

    // Set expiry: 1 hour from now
    const resetExpiry = new Date(Date.now() + 1000 * 60 * 60).toISOString()

    // Save token and expiry on user
    await payload.update({
      collection: 'site-users',
      id: user.id,
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpiration: resetExpiry,
      },
    })

    // Compose reset URL
    const resetURL = `${FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`

    await payload.sendEmail({
      collection: 'site-users',
      to: user.email,
      // customize your email subject + body here
      subject: 'Reset your password',
      html: `
        <p>Hello,</p>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <p><a href="${resetURL}">Reset Password</a></p>
        <p>If you didn’t request this, just ignore this email.</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[forgot-password]', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to send reset email' },
      { status: 500 },
    )
  }
}
