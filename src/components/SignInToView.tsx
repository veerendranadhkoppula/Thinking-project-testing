import Link from 'next/link'

export default function SignInToView() {
  return (
    <div className="min-h-screen grid place-items-center p-8">
      <div className="max-w-md w-full border rounded-2xl p-8 shadow-sm text-center">
        <h1 className="text-xl font-semibold">Sign in to view</h1>
        <p className="mt-2 text-sm">
          This canvas is restricted. Please sign in with the email that was added as a guest.
        </p>
        <Link
          href="/api/auth/signin"
          className="inline-block mt-4 px-4 py-2 rounded-xl border shadow-sm bg-white hover:bg-gray-50"
        >
          Sign in
        </Link>
      </div>
    </div>
  )
}
