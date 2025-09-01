'use client'
import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type VersionButtonProps = {
  versions: number
}

const IDX_KEY = 'selectedVersionIdx'

export function VersionButton({ versions }: VersionButtonProps) {
  const router = useRouter()
  const searchParams = useSearchParams()!
  const [isPending, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  // current values from URL
  const id = searchParams.get('id') ?? ''
  const currentVersion = Number(searchParams.get('version')) || 0
  const [selectedIdx, setSelectedIdx] = useState(currentVersion - 1)

  // load saved index
  useEffect(() => {
    const savedIdx = localStorage.getItem(IDX_KEY)
    if (savedIdx) {
      const n = parseInt(savedIdx, 10)
      if (!Number.isNaN(n) && n < versions) {
        setSelectedIdx(n)
        startTransition(() => {
          router.replace(`/canvas/WebsiteProxy?id=${id}&version=${n + 1}`)
        })
      }
    }
  }, [versions, router, id])

  // persist index
  useEffect(() => {
    localStorage.setItem(IDX_KEY, String(selectedIdx))
  }, [selectedIdx])

  // close popover on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!popoverRef.current) return
      if (e.target instanceof Node && !popoverRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const handleChoose = (idx: number) => {
    setSelectedIdx(idx)
    startTransition(() => {
      router.replace(`/canvas/WebsiteProxy?id=${id}&version=${idx + 1}`)
    })
    setOpen(false)
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className={`px-3 py-2 text-sm rounded-xl border shadow-sm ${
          isPending ? 'bg-gray-100 text-gray-400 cursor-wait' : 'bg-white hover:bg-gray-50'
        }`}
      >
        {isPending ? 'Loading…' : `Version ${selectedIdx + 1} of ${versions}`}
      </button>

      {open && !isPending && (
        <div
          className="absolute z-50 bottom-full left-0 mb-2
            w-48 max-h-64 overflow-auto rounded-xl border bg-white shadow-lg"
        >
          <div className="sticky top-0 bg-white/90 backdrop-blur px-3 py-2 border-b text-xs text-gray-500">
            Switch Version
          </div>
          <ul className="py-1">
            {Array.from({ length: versions }).map((_, i) => {
              const isActive = i === selectedIdx
              return (
                <li key={`version-${i}`}>
                  <button
                    type="button"
                    onClick={() => handleChoose(i)}
                    disabled={isPending}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      isActive ? 'bg-gray-50 font-medium' : ''
                    }`}
                  >
                    Version {i + 1}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
