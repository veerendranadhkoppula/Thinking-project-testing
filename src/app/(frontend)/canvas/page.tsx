import { redirect } from 'next/navigation'

export default async function CanvasDecider({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const { id, version, type } = sp

  if (!type) {
    return <p>Missing type query parameter</p>
  }

  redirect(`/canvas/${type}?id=${id}&version=${version}`)
}
