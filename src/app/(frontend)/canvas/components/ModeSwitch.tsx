'use client'

import { useEffect, useState } from 'react'
type Mode = 'viewer' | 'commentor'

export function ModeSwitch({
  onChange,
  defaultMode = 'viewer',
  latest = false, // 🔥 pass this from parent
}: {
  onChange: (mode: Mode) => void
  defaultMode?: Mode
  latest?: boolean
}) {
  const [mode, setMode] = useState<Mode>(defaultMode)
  const handleToggle = () => {
    if (!latest) {
      setMode('viewer')
      onChange('viewer')
      return
    }
    const newMode = mode === 'viewer' ? 'commentor' : 'viewer'
    setMode(newMode)
    onChange(newMode)
  }

  useEffect(() => {
    const handleModeChange = (e: Event) => {
      setMode('viewer')
      onChange('viewer')
    }
    window.addEventListener('iframe:url:changed', handleModeChange)
    return () => window.removeEventListener('iframe:url:changed', handleModeChange)
  }, [onChange])

  useEffect(() => {
    if (!latest) {
      setMode('viewer')
      onChange('viewer')
      return
    }
  }, [latest, onChange])

  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm ${mode === 'viewer' ? 'font-semibold' : 'text-gray-400'}`}>
        Viewer
      </span>
      <button
        onClick={handleToggle}
        disabled={!latest}
        className={`relative w-14 h-7 rounded-full transition-colors duration-300
          ${!latest ? 'bg-gray-200 cursor-not-allowed' : mode === 'viewer' ? 'bg-gray-300' : 'bg-blue-600'}
        `}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-300
          ${mode === 'viewer' ? 'translate-x-0' : 'translate-x-7'}`}
        />
      </button>

      <span className={`text-sm ${mode === 'commentor' ? 'font-semibold' : 'text-gray-400'}`}>
        Commentor
      </span>
    </div>
  )
}
