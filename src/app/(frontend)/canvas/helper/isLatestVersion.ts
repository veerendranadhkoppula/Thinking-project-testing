import payload from 'payload'

/**
 * Checks if the given websiteId + version is the latest version
 */
export async function isLatestVersion(websiteId: string, versionParam?: string): Promise<boolean> {
  if (!websiteId) return false

  try {
    const website = await payload.findByID({
      collection: 'Website',
      id: websiteId,
    })

    if (!website) return false

    const totalVersions = website.versions?.length ?? 0
    if (totalVersions === 0) return false

    const versionIndex = versionParam ? Number(versionParam) - 1 : 0
    const latestIndex = totalVersions - 1

    return versionIndex === latestIndex
  } catch (err) {
    console.error('isLatestVersion error:', err)
    return false
  }
}
