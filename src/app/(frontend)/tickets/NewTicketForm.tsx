/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './NewTicketForm.module.css'
import Image from 'next/image'

type UploadProgressMap = Record<string, number>

export default function NewTicketForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState<UploadProgressMap>({})
  const inputRef = useRef<HTMLInputElement | null>(null)

  const previews = useMemo(() => {
    return files.map((f) => ({
      name: f.name,
      url: f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
      isImage: f.type.startsWith('image/'),
      size: f.size,
      type: f.type,
    }))
  }, [files])

  useEffect(() => {
    return () => {
      previews.forEach((p) => p.url && URL.revokeObjectURL(p.url))
    }
  }, [previews])

  function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return
    const byKey = new Map<string, File>()
    ;[...files, ...selected].forEach((f) => {
      byKey.set(`${f.name}-${f.size}-${f.lastModified}`, f)
    })
    setFiles(Array.from(byKey.values()))
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeFile(idx: number) {
    const next = [...files]
    const removed = next.splice(idx, 1)
    setFiles(next)
    const p = previews[idx]
    if (p?.url) URL.revokeObjectURL(p.url)
    setProgress((prev) => {
      const copy = { ...prev }
      delete copy[removed[0]?.name || `#${idx}`]
      return copy
    })
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const formData = new FormData(form)

    const payload = {
      title: String(formData.get('title') || '').trim(),
      description: String(formData.get('description') || '').trim(),
      priority: String(formData.get('priority') || 'medium'),
      url: String(formData.get('url') || '').trim(),
      labels: String(formData.get('labels') || '')
        .split(',')
        .map((v) => ({ value: v.trim() }))
        .filter((v) => v.value),
    }

    const res = await fetch('/api/app-tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    const json = await res.json().catch(() => null)
    if (!res.ok || !json) {
      setError(
        typeof json === 'object'
          ? JSON.stringify(json)
          : (await res.text()) || 'Failed to create ticket',
      )
      setLoading(false)
      return
    }

    const createdId = json?.id || json?.doc?.id
    if (!createdId) {
      setError(`Create succeeded but no id in response: ${JSON.stringify(json)}`)
      setLoading(false)
      return
    }

    if (files.length) {
      try {
        const uploadedIds: string[] = []
        for (const file of files) {
          const id = await uploadWithProgress(file, (pct: number) => {
            setProgress((prev) => ({ ...prev, [file.name]: pct }))
          })
          uploadedIds.push(id)
        }
        if (uploadedIds.length) {
          const patch = await fetch(`/api/tickets/${createdId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ attachments: uploadedIds }),
          })
          if (!patch.ok) {
            const t = await patch.text()
            setError(`Ticket updated but attaching files failed: ${t || patch.status}`)
            setLoading(false)
            return
          }
        }
      } catch (err: any) {
        setError(`Upload failed: ${String(err?.message || err)}`)
        setLoading(false)
        return
      }
    }

    window.location.href = `/tickets/${createdId}`
  }

  function uploadWithProgress(file: File, onProgress: (pct: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/media')
      xhr.withCredentials = true
      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return
        onProgress(Math.round((evt.loaded / evt.total) * 100))
      }
      xhr.onload = () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const json = JSON.parse(xhr.responseText || '{}')
            const id = json?.doc?.id || json?.id
            if (!id) return reject(new Error('No media id in response'))
            onProgress(100)
            resolve(id)
          } else {
            reject(new Error(xhr.responseText || `HTTP ${xhr.status}`))
          }
        } catch (e) {
          reject(e)
        }
      }
      xhr.onerror = () => reject(new Error('Network error'))
      const fd = new FormData()
      fd.append('file', file)
      xhr.send(fd)
    })
  }

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.field}>
        <label>Title</label>
        <input name="title" required />
      </div>

      <div className={styles.field}>
        <label>Description</label>
        <textarea name="description" rows={6} required />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label>Status</label>
          <select name="status" defaultValue="open" disabled>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className={styles.field}>
          <label>Priority</label>
          <select name="priority" defaultValue="medium">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label>Related URL (optional)</label>
        <input name="url" placeholder="https://yoursite.com/page" />
      </div>

      <div className={styles.field}>
        <label>Labels (comma separated)</label>
        <input name="labels" placeholder="bug, ui, backend" />
      </div>

      <div className={styles.field}>
        <label>Attachments</label>
        <input ref={inputRef} name="attachments" type="file" multiple onChange={onFilesChange} />
        {files.length > 0 && (
          <ul className={styles.fileList}>
            {files.map((f, idx) => {
              const p = previews[idx]
              const pct = progress[f.name] ?? 0
              return (
                <li key={`${f.name}-${f.size}-${f.lastModified}`} className={styles.fileItem}>
                  {p.isImage ? (
                    <Image
                      src={p.url}
                      alt={f.name}
                      className={styles.thumb}
                      width={100}
                      height={100}
                    />
                  ) : (
                    <div className={styles.thumbPlaceholder} />
                  )}
                  <div className={styles.fileMeta}>
                    <div className={styles.fileName}>{f.name}</div>
                    <div className={styles.fileSub}>
                      {(f.size / 1024).toFixed(1)} KB • {f.type || 'file'}
                    </div>
                    {loading ? (
                      <progress className={styles.progress} value={pct} max={100} />
                    ) : (
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeFile(idx)}
                        aria-label={`Remove ${f.name}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <button disabled={loading} className={styles.button}>
        {loading ? 'Creating…' : 'Create ticket'}
      </button>
    </form>
  )
}
