export default function AccessDenied() {
  return (
    <div className="min-h-screen grid place-items-center p-8">
      <div className="max-w-md w-full border rounded-2xl p-8 shadow-sm text-center">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm">
          You don’t have permission to view this canvas. Ask the owner to add your email as a Guest
          or Editor.
        </p>
      </div>
    </div>
  )
}
