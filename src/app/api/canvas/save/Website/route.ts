import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // Validate required fields from Website-like object
    if (!body?.url) {
      return NextResponse.json({ ok: false, error: 'Missing required field: url' }, { status: 400 })
    }

    const payload = await getPayload({ config: configPromise })
    // console.log('Body Data: ', body.url)
    // ---- Try to find the Website entry ----
    const found = await payload.find({
      collection: 'Website',
      where: { url: { equals: body.url } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    let website = found?.docs?.[0]
    // console.log('Website Data: ', website)

    if (!website) {
      // If not found → create new Website
      website = await payload.create({
        collection: 'Website',
        data: body,
        overrideAccess: true,
      })
      return NextResponse.json({ ok: true, data: website })
    }

    // If found → update existing Website
    // If found → append new thread instead of overwriting
    const updatedVersions = [...(website.versions || [])]

    // Assume latest version always gets new threads
    const latestVersion = updatedVersions[updatedVersions.length - 1]
    if (latestVersion) {
      const pageLinks = [...(latestVersion['page-links'] || [])]
      const pageLinkIndex = pageLinks.findIndex((p) => p['page-link'] === body.pageUrl)

      if (pageLinkIndex === -1) {
        // No page-link yet → add with new thread
        pageLinks.push({
          'page-link': body.pageUrl,
          roomId: body.roomId,
          thread: [body.thread],
        })
      } else {
        // Page-link exists → push thread into it
        const pageLink = { ...pageLinks[pageLinkIndex] }
        pageLink.thread = [...(pageLink.thread || []), body.thread]
        pageLinks[pageLinkIndex] = pageLink
      }

      latestVersion['page-links'] = pageLinks
      updatedVersions[updatedVersions.length - 1] = latestVersion
    }

    // console.log(
    //   '============================= UPDATED VERISON =============================',
    //   updatedVersions,
    // )
    const updated = await payload.update({
      collection: 'Website',
      id: String(website.id),
      data: {
        ...website,
        versions: updatedVersions,
      },
      overrideAccess: true,
    })

    return NextResponse.json({ ok: true, data: updated })
  } catch (e: any) {
    console.error('Save Website API Error:', e)
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'unexpected_error' },
      { status: 500 },
    )
  }
}
