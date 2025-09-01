'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import defaultJSON from '../data/viewport.json'

type VP = { label: string; x: number; y: number; orientation?: boolean }

const IDX_KEY = 'selectedViewportIdx'
const ORI_MAP_KEY = 'viewportOrientationMap'

const deviceKey = (v: VP | undefined) => (v ? `${v.label}|${v.x}|${v.y}` : '')

export function ResponsiveButton({
  customViewport = [],
  defaultViewport = false,
}: {
  customViewport?: VP[]
  defaultViewport?: boolean
}) {
  // Merge list
  const [viewport, setViewport] = useState<VP[]>([])
  useEffect(() => {
    const defaults: VP[] = defaultViewport ? ((defaultJSON as any).viewports ?? []) : []
    setViewport([...customViewport, ...defaults])
  }, [customViewport, defaultViewport])

  // Open/close
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!popoverRef.current) return
      if (e.target instanceof Node && !popoverRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  // Selection + orientation persistence
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [rotated, setRotated] = useState(false)

  // Load saved index and orientation map once
  const [orientationMap, setOrientationMap] = useState<Record<string, boolean>>({})
  useEffect(() => {
    const savedIdx = localStorage.getItem(IDX_KEY)
    if (savedIdx) {
      const n = parseInt(savedIdx, 10)
      if (!Number.isNaN(n)) setSelectedIdx(n)
    }
    const savedMap = localStorage.getItem(ORI_MAP_KEY)
    if (savedMap) {
      try {
        const parsed = JSON.parse(savedMap)
        if (parsed && typeof parsed === 'object') setOrientationMap(parsed)
      } catch {}
    }
  }, [])

  // Keep selection in range when list changes
  useEffect(() => {
    if (viewport.length === 0) return
    if (selectedIdx >= viewport.length) setSelectedIdx(0)
  }, [viewport, selectedIdx])

  // Recompute rotated when selected device changes, from saved map
  const selected = viewport[selectedIdx]
  useEffect(() => {
    const key = deviceKey(selected)
    const saved = key ? orientationMap[key] : undefined
    setRotated(!!saved)
  }, [selectedIdx, viewport, orientationMap, selected]) // orientationMap handled below

  // Persist index whenever it changes
  useEffect(() => {
    localStorage.setItem(IDX_KEY, String(selectedIdx))
  }, [selectedIdx])

  // Toggle and persist orientation per device
  const canRotate = !!selected?.orientation
  const handleToggleOrientation = () => {
    if (!canRotate) return
    setRotated((prev) => {
      const next = !prev
      const key = deviceKey(selected)
      if (key) {
        const newMap = { ...orientationMap, [key]: next }
        setOrientationMap(newMap)
        localStorage.setItem(ORI_MAP_KEY, JSON.stringify(newMap))
      }
      return next
    })
  }

  // When orientationMap changes and we have a selected, make sure local state aligns
  useEffect(() => {
    const key = deviceKey(selected)
    if (!key) return
    const saved = orientationMap[key]
    if (typeof saved === 'boolean' && saved !== rotated) {
      setRotated(saved)
    }
  }, [orientationMap]) // eslint-disable-line react-hooks/exhaustive-deps

  // Choosing a device: load its saved orientation, default false if none
  const handleChoose = (idx: number) => {
    setSelectedIdx(idx)
    const key = deviceKey(viewport[idx])
    const saved = key ? orientationMap[key] : false
    setRotated(!!saved)
    setOpen(false)
  }

  // Dimensions (swap when rotated)
  const dims = useMemo(() => {
    if (!selected) return { x: 0, y: 0 }
    return rotated ? { x: selected.y, y: selected.x } : { x: selected.x, y: selected.y }
  }, [selected, rotated])

  useEffect(() => {
    if (!selected) return
    const payload = {
      label: selected.label,
      x: selected.x,
      y: selected.y,
      orientation: !!selected.orientation,
      rotated,
    }
    localStorage.setItem('selectedViewport', JSON.stringify(payload))
    window.dispatchEvent(new Event('viewport:changed'))
  }, [selected, rotated])

  return (
    <div className="flex items-center gap-2">
      {/* Device chooser */}
      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="px-3 py-2 text-sm rounded-xl border shadow-sm bg-white hover:bg-gray-50"
        >
          {selected ? `${selected.label} • ${dims.x}×${dims.y}` : 'Switch Device Size'}
        </button>
        {open && (
          <div
            className="absolute z-50 bottom-full -right-20-0 mb-2
              w-64 max-h-80 overflow-auto rounded-xl border bg-white shadow-lg"
          >
            {/* tiny caret */}
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0
                    border-l-8 border-l-transparent border-r-8 border-r-transparent
                    border-t-8 border-t-white drop-shadow"
            />
            <div className="sticky top-0 bg-white/90 backdrop-blur px-3 py-2 border-b text-xs text-gray-500">
              Switch Device Size
            </div>
            <ul className="py-1">
              {viewport.map((vp, i) => {
                const isActive = i === selectedIdx
                return (
                  <li key={`${vp.label}-${i}`}>
                    <button
                      type="button"
                      onClick={() => handleChoose(i)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        isActive ? 'bg-gray-50 font-medium' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{vp.label}</span>
                        <span className="shrink-0 tabular-nums text-gray-500">
                          {vp.x}×{vp.y}
                        </span>
                      </div>
                      {vp.orientation && (
                        <div className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                          Rotates
                        </div>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Orientation toggle */}
      <button
        type="button"
        onClick={handleToggleOrientation}
        disabled={!canRotate}
        className={`px-3 py-2 text-sm rounded-xl border shadow-sm ${
          canRotate ? 'bg-white hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
        title={canRotate ? 'Toggle orientation' : 'Orientation not supported for this device'}
      >
        {rotated ? 'Portrait' : 'Landscape'}
      </button>
    </div>
  )
}
