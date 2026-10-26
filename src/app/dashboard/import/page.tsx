'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'

type UploadedPhoto = { file: File; preview: string; name: string }

export default function ImportPage() {
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [date, setDate] = useState('')
  const [slug, setSlug] = useState('')
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const onTitleChange = (v: string) => {
    setTitle(v)
    if (!slug || slug === toSlug(title)) setSlug(toSlug(v))
  }

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    const newPhotos: UploadedPhoto[] = arr.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      name: f.name,
    }))
    setPhotos(prev => [...prev, ...newPhotos])
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const removePhoto = (i: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[i].preview)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !slug || photos.length === 0) {
      setError('Title, slug and at least one photo are required.')
      return
    }
    setError('')
    setUploading(true)
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('subtitle', subtitle)
      formData.append('date', date)
      formData.append('slug', slug)
      photos.forEach(p => formData.append('photos', p.file))

      const res = await fetch('/api/galleries/create', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const { error: err } = await res.json()
        throw new Error(err || 'Upload failed')
      }

      setProgress(100)
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploading(false)
    }
  }

  if (done) {
    return (
      <main className="dash-page">
        <div className="dash-hd">
          <Link href="/dashboard" className="gal-back">← Dashboard</Link>
        </div>
        <div className="import-done">
          <div className="import-done-icon">✓</div>
          <h2 className="import-done-title">Gallery created</h2>
          <p className="import-done-sub">/galleries/{slug}</p>
          <div className="import-done-actions">
            <Link href={`/galleries/${slug}`} className="gal-btn gal-btn-solid">View Gallery</Link>
            <button className="gal-btn gal-btn-ghost" onClick={() => { setDone(false); setPhotos([]); setTitle(''); setSlug(''); setSubtitle(''); setDate('') }}>
              Create Another
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="dash-page">
      <div className="dash-hd">
        <div>
          <Link href="/dashboard" className="gal-back">← Dashboard</Link>
          <h1 className="dash-name">New Gallery</h1>
          <p className="dash-sub">Upload photos to create a gallery</p>
        </div>
      </div>

      <form onSubmit={submit} className="import-form">
        {/* Metadata */}
        <div className="import-meta">
          <div className="import-field">
            <label className="import-label">Gallery Title *</label>
            <input
              className="dash-input import-input"
              placeholder="Mission NYC"
              value={title}
              onChange={e => onTitleChange(e.target.value)}
              required
            />
          </div>
          <div className="import-field">
            <label className="import-label">URL Slug *</label>
            <input
              className="dash-input import-input"
              placeholder="mission-nyc"
              value={slug}
              onChange={e => setSlug(toSlug(e.target.value))}
              required
            />
            <span className="import-hint">/galleries/{slug || 'your-slug'}</span>
          </div>
          <div className="import-field">
            <label className="import-label">Location / Subtitle</label>
            <input
              className="dash-input import-input"
              placeholder="New York City"
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
            />
          </div>
          <div className="import-field">
            <label className="import-label">Date</label>
            <input
              className="dash-input import-input"
              placeholder="October 2026"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* Drop zone */}
        <div
          className={`import-drop${dragging ? ' import-drop--active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => e.target.files && addFiles(e.target.files)}
          />
          <div className="import-drop-icon">↑</div>
          <p className="import-drop-label">Drop photos here or click to browse</p>
          <p className="import-drop-hint">JPG, PNG, HEIC · Any quantity</p>
        </div>

        {/* Preview grid */}
        {photos.length > 0 && (
          <div className="import-preview-wrap">
            <div className="import-preview-hd">
              <span className="import-label">{photos.length} photo{photos.length > 1 ? 's' : ''} selected</span>
              <button type="button" className="gal-btn gal-btn-ghost" style={{ fontSize: '.62rem' }} onClick={() => setPhotos([])}>Clear all</button>
            </div>
            <div className="import-preview-grid">
              {photos.map((p, i) => (
                <div key={i} className="import-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt={p.name} className="import-thumb-img" />
                  <button
                    type="button"
                    className="import-thumb-rm"
                    onClick={() => removePhoto(i)}
                    aria-label="Remove"
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="dash-login-err">{error}</p>}

        {uploading && (
          <div className="import-progress">
            <div className="dash-bar-track" style={{ height: '4px' }}>
              <div className="dash-bar-fill" style={{ width: `${progress}%`, transition: 'width .3s' }} />
            </div>
            <p className="import-hint" style={{ marginTop: '.5rem' }}>Uploading… {progress}%</p>
          </div>
        )}

        <button
          type="submit"
          className="gal-btn gal-btn-solid import-submit"
          disabled={uploading || photos.length === 0 || !title}
        >
          {uploading ? 'Creating…' : `Create Gallery · ${photos.length} photos`}
        </button>
      </form>
    </main>
  )
}
