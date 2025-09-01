// lib/auth.ts
import GoogleProvider from 'next-auth/providers/google'
import { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user }) {
      // Call your API route to create/match user in Payload
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/sync-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            name: user.name,
            avatar: user.image,
          }),
        })
      } catch (e) {
        console.error('Failed to sync user to Payload:', e)
      }

      return true
    },
    async session({ session }) {
      return session
    },
  },
}
