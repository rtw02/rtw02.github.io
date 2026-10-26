'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import type { Gallery } from '@/data/galleries'

export default function GalleryClient({ gallery, isAdmin }: { gallery: Gallery; isAdmin?: boolean }) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [visItems, setVisItems] = useState<Set<number>>(new Set())
  const [downloading, setDownloading] = useState(false)
  const [lbxIdx, setLbxIdx] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [replacing, setReplacing] = useState(false)
  const [replaceMsg, setReplaceMsg] = useState('')
  const gridRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lbxCardRef = useRef<HTMLDivElement>(null)
  const tiltRaf = useRef<number>(0)
  const tilt = useRef({ tx: 0, ty: 0, cx: 0, cy: 0 })

  const allSelected = selected.size === gallery.photos.length

  const toggle = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  const selectAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(gallery.photos.map((_, i) => i)))
  }

  const download = useCallback(async (indices: number[]) => {
    if (!indices.length) return
    setDownloading(true)
    setProgress(0)
    try {
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      let done = 0
      await Promise.all(indices.map(async idx => {
        const photo = gallery.photos[idx]
        const res = await fetch(photo.src)
        const blob = await res.blob()
        zip.file(photo.filename, blob)
        done++
        setProgress(Math.round((done / indices.length) * 90))
      }))
      setProgress(95)
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `${gallery.slug}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setProgress(100)
      setTimeout(() => { setProgress(0); setDownloading(false) }, 1200)

      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'download', gallery: gallery.slug, count: indices.length }),
      }).catch(() => {})
    } catch {
      setDownloading(false)
      setProgress(0)
    }
  }, [gallery])

  // Staggered entrance via IntersectionObserver
  useEffect(() => {
    const items = gridRef.current?.querySelectorAll<HTMLElement>('.gal-item')
    if (!items) return
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement
          const idx = Array.from(items).indexOf(el)
          setTimeout(() => setVisItems(prev => { const s = new Set(prev); s.add(idx); return s }), idx * 45)
          io.unobserve(el)
        }
      })
    }, { threshold: 0.04 })
    items.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      setLbxIdx(prev => {
        if (prev === null) return null
        if (e.key === 'Escape') return null
        if (e.key === 'ArrowRight') return (prev + 1) % gallery.photos.length
        if (e.key === 'ArrowLeft') return (prev - 1 + gallery.photos.length) % gallery.photos.length
        return prev
      })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [gallery.photos.length])

  useEffect(() => {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'view', gallery: gallery.slug }),
    }).catch(() => {})
  }, [gallery.slug])

  // Reset tilt when lightbox closes
  useEffect(() => {
    if (lbxIdx === null) {
      cancelAnimationFrame(tiltRaf.current)
      tilt.current = { tx: 0, ty: 0, cx: 0, cy: 0 }
      if (lbxCardRef.current) lbxCardRef.current.style.transform = ''
    }
  }, [lbxIdx])

  const onTiltMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = lbxCardRef.current
    if (!card) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    tilt.current.tx = x * 14
    tilt.current.ty = -y * 10
    if (!tiltRaf.current) {
      const loop = () => {
        const t = tilt.current
        t.cx += (t.tx - t.cx) * 0.1
        t.cy += (t.ty - t.cy) * 0.1
        if (lbxCardRef.current)
          lbxCardRef.current.style.transform = `rotateX(${t.cy}deg) rotateY(${t.cx}deg) scale3d(1.02,1.02,1.02)`
        tiltRaf.current = requestAnimationFrame(loop)
      }
      tiltRaf.current = requestAnimationFrame(loop)
    }
  }, [])

  const onTiltLeave = useCallback(() => {
    tilt.current.tx = 0
    tilt.current.ty = 0
  }, [])

  const selectedArr = Array.from(selected)

  return (
    <div className="gal-page">
      <header className="gal-header">
        <Link href="/galleries" className="gal-back">← Galleries</Link>
        <div className="gal-header-center">
          <h1 className="gal-title">{gallery.title}</h1>
          <p className="gal-meta">{gallery.subtitle} &nbsp;·&nbsp; {gallery.date} &nbsp;·&nbsp; {gallery.photos.length} photos</p>
        </div>
        <div className="gal-header-actions">
          <button className="gal-btn gal-btn-ghost" onClick={selectAll}>
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          <button
            className="gal-btn gal-btn-solid"
            onClick={() => download(gallery.photos.map((_, i) => i))}
            disabled={downloading}
          >
            {downloading ? `${progress}%` : '↓ Download All'}
          </button>
        </div>
      </header>

      <main className="gal-grid-wrap">
        <div className="gal-justified" ref={gridRef}>
          {gallery.photos.map((photo, i) => {
            const isSelected = selected.has(i)
            const isVis = visItems.has(i)
            return (
              <div
                key={i}
                className={`gal-item${isVis ? ' vis' : ''}${isSelected ? ' gal-item--selected' : ''}`}
                onClick={e => {
                  // Only open lightbox if click is in the center area (not near top-left corner)
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  const x = e.clientX - rect.left
                  const y = e.clientY - rect.top
                  if (x < 64 && y < 64) {
                    toggle(i)
                  } else {
                    setLbxIdx(i)
                  }
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="gal-item-img"
                  loading={i < 12 ? 'eager' : 'lazy'}
                  fetchPriority={i < 6 ? 'high' : 'auto'}
                />
                <div className="gal-item-overlay" />
                <button
                  className="gal-item-check"
                  aria-label={isSelected ? 'Deselect' : 'Select'}
                  onClick={e => { e.stopPropagation(); toggle(i) }}
                >
                  <span className="gal-item-check-dot">{isSelected ? '✓' : ''}</span>
                </button>
              </div>
            )
          })}
        </div>
      </main>

      {selected.size > 0 && (
        <div className="gal-sel-bar">
          <div className="gal-sel-left">
            <span className="gal-sel-count">{selected.size} photo{selected.size > 1 ? 's' : ''} selected</span>
            <button className="gal-sel-clear" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
          <div className="gal-sel-actions">
            <button
              className="gal-btn-sel-dl"
              onClick={() => download(selectedArr)}
              disabled={downloading}
            >
              {downloading ? `Downloading… ${progress}%` : `↓ Download ${selected.size}`}
            </button>
          </div>
        </div>
      )}

      {lbxIdx !== null && (() => {
        const photo = gallery.photos[lbxIdx]
        return (
          <>
          <div className="lbx" role="dialog" aria-modal onClick={() => setLbxIdx(null)}>
            <span className="lbx-counter">{String(lbxIdx + 1).padStart(2,'0')} / {String(gallery.photos.length).padStart(2,'0')}</span>
            <button className="lbx-close" onClick={() => setLbxIdx(null)}>✕</button>
            <button className="lbx-nav lbx-prev" onClick={e => { e.stopPropagation(); setLbxIdx((lbxIdx - 1 + gallery.photos.length) % gallery.photos.length) }}>←</button>
            <div className="lbx-scene" onMouseMove={onTiltMove} onMouseLeave={onTiltLeave} onClick={e => e.stopPropagation()}>
              <div className="lbx-card" ref={lbxCardRef}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="lbx-img" src={photo.src} alt={photo.alt} />
              </div>
            </div>
            <button className="lbx-nav lbx-next" onClick={e => { e.stopPropagation(); setLbxIdx((lbxIdx + 1) % gallery.photos.length) }}>→</button>
            <div className="lbx-meta" onClick={e => e.stopPropagation()}>
              <div className="lbx-name">{photo.alt}</div>
              <div className="lbx-actions">
                <button
                  className="gal-btn gal-btn-ghost lbx-dl"
                  onClick={e => { e.stopPropagation(); download([lbxIdx]) }}
                >↓ Download</button>
                {isAdmin && (
                  <button
                    className="gal-btn gal-btn-ghost lbx-replace"
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                    disabled={replacing}
                  >{replacing ? replaceMsg || 'Uploading…' : '⇄ Replace'}</button>
                )}
              </div>
            </div>
          </div>
          {isAdmin && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={async e => {
                const file = e.target.files?.[0]
                if (!file || lbxIdx === null) return
                setReplacing(true)
                setReplaceMsg('Uploading…')
                const fd = new FormData()
                fd.append('file', file)
                fd.append('slug', gallery.slug)
                fd.append('filename', gallery.photos[lbxIdx].filename)
                try {
                  const res = await fetch('/api/photo/replace', { method: 'POST', body: fd })
                  if (res.ok) {
                    setReplaceMsg('Done!')
                    // bust browser cache for this photo
                    const img = document.querySelector<HTMLImageElement>(`.lbx-img`)
                    if (img) img.src = gallery.photos[lbxIdx].src + '?t=' + Date.now()
                  } else {
                    const { error } = await res.json().catch(() => ({ error: 'Failed' }))
                    setReplaceMsg(error || 'Failed')
                  }
                } catch {
                  setReplaceMsg('Failed')
                } finally {
                  setTimeout(() => { setReplacing(false); setReplaceMsg('') }, 2000)
                  e.target.value = ''
                }
              }}
            />
          )}
          </>
        )
      })()}
    </div>
  )
}
