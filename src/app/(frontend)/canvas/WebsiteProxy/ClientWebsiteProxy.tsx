'use client'
import IframePreview from '../components/IframePane'
import { ResponsiveButton } from '../components/ResponsiveButton'
import { CommentsButton } from '../components/CommentPanel'
import { VersionButton } from '../components/VersionButton'
import { ModeSwitch } from '../components/ModeSwitch'
import Link from 'next/link'
import { Website } from '@/payload-types'
import { useState, useEffect } from 'react'
import { useLoading } from '@/app/context/LoadingContext'

type Props = {
  websiteData: Website
  versionsArr: any[]
  safeVersionIdx: number
  threads: any[]
  firstPageLink: string
  websiteId: string
  latest: boolean
}

export default function ClientWebsiteProxy({
  websiteData,
  versionsArr,
  safeVersionIdx,
  threads,
  firstPageLink,
  websiteId,
  latest,
}: Props) {
  const [mode, setMode] = useState<'viewer' | 'commentor'>('viewer')
  const { setLoading } = useLoading()

  useEffect(() => {
    setLoading(false)
  }, [setLoading])

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-hidden">
        <IframePreview
          pageData={websiteData}
          url={websiteData.url ?? ''}
          injectionType={websiteData.type?.injectionType ?? 'Proxy'}
          latest={latest}
          mode={mode}
        />
      </div>

      <div className="shrink-0 border-t p-2 bg-transparent flex gap-2">
        <div className="flex justify-between w-full">
          <div className="flex flex-row gap-2">
            <ResponsiveButton
              customViewport={
                websiteData.viewports?.map((v) => ({
                  label: v.label ?? '',
                  x: v.x ?? 0,
                  y: v.y ?? 0,
                  orientation: v.orientation ?? false,
                })) ?? []
              }
              defaultViewport={websiteData.enableDefaultViewports ?? false}
            />
            <VersionButton versions={versionsArr.length || 1} />
          </div>

          <div className="flex flex-row gap-2">
            <ModeSwitch onChange={setMode} latest={latest} />
          </div>

          <div className="flex flex-row gap-2">
            <CommentsButton
              threads={threads}
              websiteId={websiteId}
              version={(safeVersionIdx + 1).toString()}
              pageLink={firstPageLink}
              latest={latest}
            />
            <Link
              href={`/task-list?id=${websiteId}`}
              className="px-3 py-2 text-sm rounded-xl border shadow-sm bg-white hover:bg-gray-50"
              onClick={() => setLoading(true)}
            >
              Tasks
            </Link>
            <Link
              href="/"
              className="px-3 py-2 text-sm rounded-xl border shadow-sm bg-white hover:bg-gray-50"
              onClick={() => setLoading(true)}
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
