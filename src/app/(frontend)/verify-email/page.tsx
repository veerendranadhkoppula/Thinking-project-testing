import { Suspense } from 'react'
import VerifyEmailPage from './VerifyEmailPage'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading verification...</div>}>
      <VerifyEmailPage />
    </Suspense>
  )
}
