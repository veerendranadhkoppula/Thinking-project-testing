import { authenticated } from '@/access/authenticated'
import type { CollectionConfig } from 'payload'

const SiteUsers: CollectionConfig = {
  slug: 'site-users',
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: authenticated,
  },
  auth: {
    verify: {
      generateEmailHTML: async ({ token, user }) => {
        const verifyURL = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/verify-email?token=${token}&email=${user.email}`
        return `
          <html>
            <body>
              <p>Hello ${user.email},</p>
              <p>Click the link below to verify your email and log in:</p>
              <a href="${verifyURL}">Verify Email</a>
            </body>
          </html>
        `
      },
      generateEmailSubject: ({ user }) => {
        return `Verify your email address, ${user.email}`
      },
    },
    forgotPassword: {
      generateEmailHTML: async ({ token, user } = {}) => {
        const resetURL = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/reset-password?token=${token}`
        return `
          <html>
            <body style="font-family: sans-serif;">
              <h2>Password Reset</h2>
              <p>Hello ${user.email},</p>
              <p>Click the link below to reset your password:</p>
              <p><a href="${resetURL}" style="color: #2563eb;">Reset Password</a></p>
            </body>
          </html>
        `
      },
      generateEmailSubject: ({ user } = {}) => {
        return `Reset your password, ${user.email}`
      },
    },
  },
  admin: { useAsTitle: 'email' },
  fields: [
    { name: 'name', type: 'text', unique: true },
    { name: 'avatar', type: 'text' },
    {
      name: 'role',
      type: 'select',
      options: ['member', 'premium', 'guest'],
      defaultValue: 'member',
    },
    {
      name: 'resetPasswordToken',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'resetPasswordExpiration',
      type: 'date',
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}

export default SiteUsers
