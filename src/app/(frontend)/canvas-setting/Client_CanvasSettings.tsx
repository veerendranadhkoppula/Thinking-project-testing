// src/app/canvas-setting/Client_CanvasSettings.tsx
'use client'
import { useLoading } from '@/app/context/LoadingContext' // ✅ added
import React, { useEffect, useMemo, useState, useTransition } from 'react'
import styles from './CanvasSettings.module.css'
import { useSession } from 'next-auth/react'
import {
  addEditorAction,
  deleteEditorAction,
  addGuestAction,
  deleteGuestAction,
  addViewportAction,
  deleteViewportAction,
  createVersionAction,
} from './actions'
import { notFound, useRouter } from 'next/navigation'

type EditorRow = { editor: string }
type GuestRow = { guest: string }
type ViewportRow = { label: string; x: number; y: number }

interface Props {
  data: {
    id?: string | string[]
    type?: string | string[]
    version?: string | string[]
    injection?: string | string[]
    editors?: EditorRow[]
    guests?: GuestRow[]
    viewports?: ViewportRow[]
    versions?: number[]
    mediaPathSegment?: string
    isAdmin?: boolean
  } | null
}

export default function Client_CanvasSettings({ data }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'editor' | 'guest' | 'viewport' | 'versions'>('editor')
  const { setLoading } = useLoading() // ✅ added
  useEffect(() => {
    setLoading(false) // ✅ hide loader on mount
  }, [setLoading])
  // Editors
  const [editors, setEditors] = useState<EditorRow[]>([])
  const [email, setEmail] = useState('')
  // Guests
  const [guests, setGuests] = useState<GuestRow[]>([])
  const [guestInput, setGuestInput] = useState('')
  // Viewports
  const [viewports, setViewports] = useState<ViewportRow[]>([])
  const [vpLabel, setVpLabel] = useState('')
  const [vpX, setVpX] = useState('')
  const [vpY, setVpY] = useState('')
  // Versions
  const [versions, setVersions] = useState<number[]>([])
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)
  const [newVersionUrl, setNewVersionUrl] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const docId = useMemo(() => (typeof data?.id === 'string' ? data.id : data?.id?.[0]), [data])
  const type = useMemo(() => (typeof data?.type === 'string' ? data.type : data?.type?.[0]), [data])
  const mediaPathSegment = data?.mediaPathSegment || 'Website'

  useEffect(() => {
    setEditors(data?.editors ?? [])
    setGuests(data?.guests ?? [])
    setViewports(data?.viewports ?? [])
    setVersions(data?.versions ?? [])
    if (!data?.isAdmin) {
      notFound()
    }
  }, [data])

  if (!docId || !type) {
    return <div className={styles.container}>Invalid URL, missing id or type</div>
  }

  function withTransition<T>(fn: () => Promise<T>) {
    setError(null)
    startTransition(async () => {
      try {
        await fn()
      } catch (e: any) {
        setError(e?.message ?? 'Something went wrong')
      }
    })
  }

  // Editors
  const onAddEditor = (e: React.FormEvent) => {
    e.preventDefault()
    const v = email.trim().toLowerCase()
    if (!v) return
    const rollback = editors
    if (!editors.some((x) => x.editor.toLowerCase() === v)) setEditors([...editors, { editor: v }])
    withTransition(async () => {
      const res = await addEditorAction({ id: docId, type }, v)
      if (!res.ok) {
        setEditors(rollback)
        setError(res.error ?? 'Failed to add editor')
        return
      }
      setEditors(res.editors ?? [])
      setEmail('')
    })
  }

  const onDeleteEditor = (target: string) => {
    const rollback = editors
    setEditors(editors.filter((e) => e.editor.toLowerCase() !== target.toLowerCase()))
    withTransition(async () => {
      const res = await deleteEditorAction({ id: docId, type }, target)
      if (!res.ok) {
        setEditors(rollback)
        setError(res.error ?? 'Failed to delete editor')
      } else {
        setEditors(res.editors ?? [])
      }
    })
  }

  // Guests
  const onAddGuest = (e: React.FormEvent) => {
    e.preventDefault()
    const v = guestInput.trim().toLowerCase()
    if (!v) return
    const rollback = guests
    if (!guests.some((x) => x.guest.toLowerCase() === v)) setGuests([...guests, { guest: v }])
    withTransition(async () => {
      const res = await addGuestAction({ id: docId, type }, v)
      if (!res.ok) {
        setGuests(rollback)
        setError(res.error ?? 'Failed to add guest')
        return
      }
      setGuests(res.guests ?? [])
      setGuestInput('')
    })
  }

  const onDeleteGuest = (target: string) => {
    const rollback = guests
    setGuests(guests.filter((g) => g.guest.toLowerCase() !== target.toLowerCase()))
    withTransition(async () => {
      const res = await deleteGuestAction({ id: docId, type }, target)
      if (!res.ok) {
        setGuests(rollback)
        setError(res.error ?? 'Failed to delete guest')
      } else {
        setGuests(res.guests ?? [])
      }
    })
  }

  // Viewports
  const onAddViewport = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vpLabel.trim()) return
    const vp: ViewportRow = { label: vpLabel.trim(), x: Number(vpX), y: Number(vpY) }
    const rollback = viewports
    setViewports([...viewports, vp])
    withTransition(async () => {
      const res = await addViewportAction({ id: docId, type }, vp)
      if (!res.ok) {
        setViewports(rollback)
        setError('Failed to add viewport')
      } else {
        setViewports(res.viewports ?? [])
        setVpLabel('')
        setVpX('')
        setVpY('')
      }
    })
  }

  const onDeleteViewport = (label: string) => {
    const rollback = viewports
    setViewports(viewports.filter((v) => v.label !== label))
    withTransition(async () => {
      const res = await deleteViewportAction({ id: docId, type }, label)
      if (!res.ok) {
        setViewports(rollback)
        setError('Failed to delete viewport')
      } else {
        setViewports(res.viewports ?? [])
      }
    })
  }

  // Versions: no server actions needed if versions are part of the doc
  const onViewVersion = (ver: number) => {
    const url = `http://localhost:3000/canvas/${mediaPathSegment}?id=${encodeURIComponent(
      docId,
    )}&version=${encodeURIComponent(String(ver))}`
    router.push(url)
  }

  function openCreateVersion() {
    setIsVersionModalOpen(true)
    setError(null)
    setNewVersionUrl('') // empty means fallback to doc.url
  }

  function submitCreateVersion(e: React.FormEvent) {
    e.preventDefault()
    if (!docId || !type) return

    withTransition(async () => {
      const res = await createVersionAction(
        { id: docId, type },
        { url: newVersionUrl || undefined },
      )
      if (!res.ok) {
        setError(res.error ?? 'Failed to create version')
        return
      }
      setVersions(Array.from({ length: res.versionsCount ?? versions.length + 1 }, (_, i) => i + 1))
      setIsVersionModalOpen(false)
      setNewVersionUrl('')
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <button className={styles.tabButton} onClick={() => router.push('/')}>
          Go Back
        </button>
        <button
          className={`${styles.tabButton} ${tab === 'editor' ? styles.active : ''}`}
          onClick={() => setTab('editor')}
        >
          Editors
        </button>
        <button
          className={`${styles.tabButton} ${tab === 'guest' ? styles.active : ''}`}
          onClick={() => setTab('guest')}
        >
          Guests
        </button>
        <button
          className={`${styles.tabButton} ${tab === 'viewport' ? styles.active : ''}`}
          onClick={() => setTab('viewport')}
        >
          Viewports
        </button>
        <button
          className={`${styles.tabButton} ${tab === 'versions' ? styles.active : ''}`}
          onClick={() => setTab('versions')}
        >
          Versions
        </button>
      </div>

      <div className={styles.content}>
        {/* Editors */}
        {tab === 'editor' && (
          <div className={styles.section}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ margin: 0 }}>Editors</h2>
            </div>
            <form onSubmit={onAddEditor} style={{ marginTop: 12, marginBottom: 12 }}>
              <input
                type="email"
                placeholder="Editor email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" disabled={isPending || !email.trim()}>
                {isPending ? 'Working…' : 'Add New'}
              </button>
            </form>
            {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {editors.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ opacity: 0.7 }}>
                      No editors yet
                    </td>
                  </tr>
                )}
                {editors.map((e) => (
                  <tr key={e.editor}>
                    <td>{e.editor}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => onDeleteEditor(e.editor)}
                        disabled={isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Guests */}
        {tab === 'guest' && (
          <div className={styles.section}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ margin: 0 }}>Guests</h2>
            </div>
            <form onSubmit={onAddGuest} style={{ marginTop: 12, marginBottom: 12 }}>
              <input
                type="email"
                placeholder="Guest Email"
                value={guestInput}
                onChange={(e) => setGuestInput(e.target.value)}
                required
              />
              <button type="submit" disabled={isPending || !guestInput.trim()}>
                {isPending ? 'Working…' : 'Add New'}
              </button>
            </form>
            {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
            <table>
              <thead>
                <tr>
                  <th>Guest</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {guests.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ opacity: 0.7 }}>
                      No guests yet
                    </td>
                  </tr>
                )}
                {guests.map((g) => (
                  <tr key={g.guest}>
                    <td>{g.guest}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => onDeleteGuest(g.guest)}
                        disabled={isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Viewports */}
        {tab === 'viewport' && (
          <div className={styles.section}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ margin: 0 }}>Viewports</h2>
            </div>
            <form onSubmit={onAddViewport} style={{ marginTop: 12, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Label"
                value={vpLabel}
                onChange={(e) => setVpLabel(e.target.value)}
                required
              />
              <input
                type="number"
                placeholder="X"
                value={vpX}
                onChange={(e) => setVpX(e.target.value)}
                required
              />
              <input
                type="number"
                placeholder="Y"
                value={vpY}
                onChange={(e) => setVpY(e.target.value)}
                required
              />
              <button type="submit" disabled={isPending}>
                {isPending ? 'Working…' : 'Add New'}
              </button>
            </form>
            {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
            <table>
              <thead>
                <tr>
                  <th>Label</th>
                  <th>X</th>
                  <th>Y</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {viewports.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ opacity: 0.7 }}>
                      No viewports yet
                    </td>
                  </tr>
                )}
                {viewports.map((v) => (
                  <tr key={v.label}>
                    <td>{v.label}</td>
                    <td>{v.x}</td>
                    <td>{v.y}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => onDeleteViewport(v.label)}
                        disabled={isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Versions */}
        {tab === 'versions' && (
          <div className={styles.section}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Versions</h2>
              <button onClick={openCreateVersion} disabled={isPending}>
                Create Version
              </button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Version ID</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ opacity: 0.7 }}>
                      No versions
                    </td>
                  </tr>
                )}
                {versions.map((ver) => (
                  <tr key={ver}>
                    <td>v{ver}</td>
                    <td>
                      <button type="button" onClick={() => onViewVersion(ver)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Create Version Modal */}
            {isVersionModalOpen && (
              <div className={styles.modalOverlay}>
                <div className={styles.modal}>
                  <form onSubmit={submitCreateVersion}>
                    <label>Page URL (optional)</label>
                    <input
                      type="url"
                      name="url"
                      placeholder="https://example.com, leave empty to use doc.url"
                      value={newVersionUrl}
                      onChange={(e) => setNewVersionUrl(e.target.value)}
                    />

                    <div className={styles.modalActions}>
                      <button type="submit" disabled={isPending}>
                        {isPending ? 'Creating…' : 'Create'}
                      </button>
                      <button type="button" onClick={() => setIsVersionModalOpen(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
