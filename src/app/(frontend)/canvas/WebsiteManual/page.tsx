import configPromise from '@/payload.config'
import payload from 'payload'

export const dynamic = 'force-dynamic'

export default async function WebsiteManual({
  params,
  searchParams,
}: {
  params?: Promise<Record<string, string>>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedParams = (await params) ?? {}
  const resolvedSearchParams = (await searchParams) ?? {}

  const { id, version } = resolvedSearchParams
  const { WebsiteManual } = resolvedParams

  const config = await configPromise
  await payload.init({ config })

  let websiteData = null
  if (id) {
    try {
      websiteData = await payload.findByID({
        collection: 'Website',
        id: id as string,
      })
    } catch (err) {
      console.error('Error fetching Website:', err)
    }
  }

  return (
    <div>
      <h1>Website Manual Page</h1>
      <p>Dynamic Route Slug: {WebsiteManual}</p>
      <p>ID: {id}</p>
      <p>Version: {version}</p>

      <h2>Website Data from Payload:</h2>
      <pre>{JSON.stringify(websiteData, null, 2)}</pre>
    </div>
  )
}
