'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'next-view-transitions'
import type { Gallery } from '@/data/galleries'

// Shareable per-photo URL uses the filename WITHOUT its extension (e.g. DSC08007).
const photoKey = (filename: string) => filename.replace(/\.[^.]+$/, '')

export default function GalleryClient(
  { gallery, isAdmin, initialPhoto }: { gallery: Gallery; isAdmin?: boolean; initialPhoto?: string }
) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [visItems, setVisItems] = useState<Set<number>>(new Set())
  const [deletedPhotos, setDeletedPhotos] = useState<Set<number>>(new Set())
  const [downloading, setDownloading] = useState(false)
  const [lbxIdx, setLbxIdx] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState('')
  const [shareMsg, setShareMsg] = useState('')
  const didInitPhoto = useRef(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const lbxCardRef = useRef<HTMLDivElement>(null)
  const tiltRaf = useRef<number>(0)
  const tilt = useRef({ tx: 0, ty: 0, cx: 0, cy: 0 })
  const touchStartX = useRef<number>(0)

  const visiblePhotos = gallery.photos.filter((_, i) => !deletedPhotos.has(i))
  const allSelected = selected.size === visiblePhotos.length

  const deletePhoto = useCallback(async (idx: number) => {
    const photo = gallery.photos[idx]
    if (!photo) return
    setDeleting(true)
    setDeleteMsg('Deleting…')
    try {
      const res = await fetch('/api/photo/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: gallery.slug, filename: photo.filename }),
      })
      if (res.ok) {
        setDeletedPhotos(prev => { const s = new Set(prev); s.add(idx); return s })
        setLbxIdx(null)
        setSelected(prev => { const s = new Set(prev); s.delete(idx); return s })
        setDeleteMsg('')
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Failed' }))
        setDeleteMsg(error || 'Failed')
      }
    } catch {
      setDeleteMsg('Failed')
    } finally {
      setTimeout(() => { setDeleting(false); setDeleteMsg('') }, 2000)
    }
  }, [gallery])

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

  const canWebShare = typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'

  const fetchBlobs = useCallback(async (indices: number[], onProgress?: (p: number) => void) => {
    let done = 0
    return Promise.all(indices.map(async idx => {
      const photo = gallery.photos[idx]
      const res = await fetch(photo.src)
      const blob = await res.blob()
      done++
      onProgress?.(Math.round((done / indices.length) * 90))
      return { filename: photo.filename, blob }
    }))
  }, [gallery])

  const download = useCallback(async (indices: number[]) => {
    if (!indices.length) return

    if (indices.length === 1) {
      // Single photo — native browser download to default Downloads folder, no blob
      const photo = gallery.photos[indices[0]]
      const a = document.createElement('a')
      a.href = photo.src
      a.download = photo.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'download', gallery: gallery.slug, count: 1 }),
      }).catch(() => {})
      return
    }

    setDownloading(true)
    setProgress(0)
    try {
      const blobs = await fetchBlobs(indices, setProgress)

      {
        // Multiple photos — zip
        const { default: JSZip } = await import('jszip')
        const zip = new JSZip()
        blobs.forEach(({ filename, blob }) => zip.file(filename, blob))
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
      }

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
  }, [gallery, fetchBlobs])

  const share = useCallback(async (indices: number[]) => {
    if (!indices.length || !canWebShare) return
    setDownloading(true)
    setProgress(0)
    try {
      const blobs = await fetchBlobs(indices, setProgress)
      const files = blobs.map(({ filename, blob }) =>
        new File([blob], filename, { type: blob.type || 'image/jpeg' })
      )
      if (!navigator.canShare({ files })) return
      await navigator.share({ files, title: gallery.title })
      setProgress(100)
      setTimeout(() => { setProgress(0); setDownloading(false) }, 800)
    } catch (err: unknown) {
      // AbortError = user cancelled share sheet — not a real error
      if (err instanceof Error && err.name !== 'AbortError') console.error(err)
      setDownloading(false)
      setProgress(0)
    }
  }, [gallery, fetchBlobs, canWebShare])

  // Share the photo's own page URL (native share sheet, clipboard fallback)
  const sharePhotoLink = useCallback(async (idx: number) => {
    const photo = gallery.photos[idx]
    if (!photo || typeof window === 'undefined') return
    const url = `${window.location.origin}/galleries/${gallery.slug}/${photoKey(photo.filename)}`
    const data = { title: gallery.title, text: photo.alt || gallery.title, url }
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
        await navigator.share(data)
        return
      }
    } catch (err: unknown) {
      // user dismissed the share sheet — nothing to copy
      if (err instanceof Error && err.name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg('Link copied')
    } catch {
      setShareMsg('Copy failed')
    }
    setTimeout(() => setShareMsg(''), 1800)
  }, [gallery])

  // Move the lightbox over VISIBLE photos only — skip deleted / broken (onError) ones
  const stepLbx = useCallback((delta: number) => {
    setLbxIdx(prev => {
      if (prev === null) return null
      const vis = gallery.photos.map((_, i) => i).filter(i => !deletedPhotos.has(i))
      if (!vis.length) return null
      const pos = vis.indexOf(prev)
      if (pos === -1) return vis[0]
      return vis[(pos + delta + vis.length) % vis.length]
    })
  }, [gallery.photos, deletedPhotos])

  // Deep link: open the lightbox on the shared photo once, on mount
  useEffect(() => {
    if (didInitPhoto.current || !initialPhoto) return
    didInitPhoto.current = true
    const idx = gallery.photos.findIndex(p => photoKey(p.filename) === initialPhoto)
    if (idx >= 0) setLbxIdx(idx)
  }, [initialPhoto, gallery.photos])

  // Keep the address bar in sync with the open photo (shallow — no refetch)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const path = lbxIdx === null
      ? `/galleries/${gallery.slug}`
      : `/galleries/${gallery.slug}/${photoKey(gallery.photos[lbxIdx].filename)}`
    window.history.replaceState(null, '', path)
  }, [lbxIdx, gallery.slug, gallery.photos])

  // JS masonry — left-to-right chronological order with no gaps
  const masonryLayout = useCallback(() => {
    const grid = gridRef.current
    if (!grid) return
    const containerW = grid.clientWidth
    if (!containerW) return
    const GAP = 4
    const cols = containerW > 1100 ? 5 : containerW > 700 ? 4 : 3
    const colW = (containerW - GAP * (cols - 1)) / cols
    const colHeights = Array(cols).fill(0)

    const visPhotos = gallery.photos.filter((_, idx) => !deletedPhotos.has(idx))
    const items = grid.querySelectorAll<HTMLElement>('.gal-item')
    items.forEach((item, i) => {
      const photo = visPhotos[i]
      if (!photo) return
      const shortestIdx = colHeights.indexOf(Math.min(...colHeights))
      const left = shortestIdx * (colW + GAP)
      const top = colHeights[shortestIdx]
      const h = colW * (photo.h / photo.w)

      item.style.left = `${left}px`
      item.style.top = `${top}px`
      item.style.width = `${colW}px`
      item.style.height = `${h}px`

      colHeights[shortestIdx] += h + GAP
    })
    grid.style.height = `${Math.max(...colHeights) - GAP}px`
  }, [gallery.photos, deletedPhotos])

  useEffect(() => {
    masonryLayout()
    const ro = new ResizeObserver(masonryLayout)
    if (gridRef.current) ro.observe(gridRef.current)
    return () => ro.disconnect()
  }, [masonryLayout])

  // Grid item hover parallax — direct DOM, no re-renders
  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    let activeEl: HTMLElement | null = null

    const onMove = (e: MouseEvent) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('.gal-item')
      if (!item) return
      const r = item.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      item.style.transform = `perspective(700px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) scale(1.02)`
      item.style.zIndex = '2'
      if (activeEl && activeEl !== item) {
        activeEl.style.transform = ''
        activeEl.style.zIndex = ''
      }
      activeEl = item
    }

    const onLeave = (e: MouseEvent) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('.gal-item')
      if (item) { item.style.transform = ''; item.style.zIndex = '' }
      activeEl = null
    }

    grid.addEventListener('mousemove', onMove)
    grid.addEventListener('mouseleave', onLeave)
    return () => {
      grid.removeEventListener('mousemove', onMove)
      grid.removeEventListener('mouseleave', onLeave)
    }
  }, [])

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
      if (e.key === 'Escape') { setLbxIdx(null); return }
      if (e.key === 'ArrowRight') stepLbx(1)
      if (e.key === 'ArrowLeft') stepLbx(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [stepLbx])

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
            if (deletedPhotos.has(i)) return null
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
                  style={i === 0 ? { viewTransitionName: `gcover-${gallery.slug}` } : undefined}
                  onError={() => setDeletedPhotos(prev => { const s = new Set(prev); s.add(i); return s })}
                />
                <div className="gal-item-overlay" />
                <button
                  className="gal-item-check"
                  aria-label={isSelected ? 'Deselect' : 'Select'}
                  onClick={e => { e.stopPropagation(); toggle(i) }}
                >
                  <span className="gal-item-check-dot">{isSelected ? '✓' : ''}</span>
                </button>
                {isAdmin && (
                  <button
                    className="gal-item-delete"
                    aria-label="Delete photo"
                    onClick={e => {
                      e.stopPropagation()
                      if (confirm(`Delete ${photo.filename}? This cannot be undone.`)) deletePhoto(i)
                    }}
                  >
                    ✕
                  </button>
                )}
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
            {canWebShare ? (
              <button
                className="gal-btn-sel-dl"
                onClick={() => share(selectedArr)}
                disabled={downloading}
              >
                {downloading ? `${progress}%` : `Save ${selected.size} to Photos`}
              </button>
            ) : (
              <button
                className="gal-btn-sel-dl"
                onClick={() => download(selectedArr)}
                disabled={downloading}
              >
                {downloading
                  ? `${progress}%`
                  : selected.size === 1
                    ? '↓ Download'
                    : `↓ Download ${selected.size} (zip)`}
              </button>
            )}
          </div>
        </div>
      )}

      {lbxIdx !== null && (() => {
        const photo = gallery.photos[lbxIdx]
        const visIndices = gallery.photos.map((_, i) => i).filter(i => !deletedPhotos.has(i))
        const lbxPos = visIndices.indexOf(lbxIdx)
        return (
          <>
          <div
            className="lbx" role="dialog" aria-modal
            onClick={() => setLbxIdx(null)}
            onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
            onTouchEnd={e => {
              const dx = e.changedTouches[0].clientX - touchStartX.current
              if (Math.abs(dx) > 50) {
                e.stopPropagation()
                stepLbx(dx < 0 ? 1 : -1)
              }
            }}
          >
            <span className="lbx-counter">{String(lbxPos + 1).padStart(2,'0')} / {String(visIndices.length).padStart(2,'0')}</span>
            <button className="lbx-close" onClick={() => setLbxIdx(null)}>✕</button>
            <button className="lbx-nav lbx-prev" onClick={e => { e.stopPropagation(); stepLbx(-1) }}>←</button>
            <div className="lbx-scene" onMouseMove={onTiltMove} onMouseLeave={onTiltLeave} onClick={e => e.stopPropagation()}>
              <div className="lbx-card" ref={lbxCardRef}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="lbx-img" src={photo.src} alt={photo.alt} />
              </div>
            </div>
            <button className="lbx-nav lbx-next" onClick={e => { e.stopPropagation(); stepLbx(1) }}>→</button>
            <div className="lbx-meta" onClick={e => e.stopPropagation()}>
              <div className="lbx-name">{photo.alt}</div>
              <div className="lbx-filename">{photo.filename}</div>
              <div className="lbx-actions">
                <button
                  className="gal-btn gal-btn-ghost lbx-share"
                  onClick={e => { e.stopPropagation(); sharePhotoLink(lbxIdx) }}
                >{shareMsg || '⤴ Share'}</button>
                {canWebShare ? (
                  <button
                    className="gal-btn gal-btn-ghost lbx-dl"
                    onClick={e => { e.stopPropagation(); share([lbxIdx]) }}
                    disabled={downloading}
                  >{downloading ? `${progress}%` : 'Save to Photos'}</button>
                ) : (
                  <button
                    className="gal-btn gal-btn-ghost lbx-dl"
                    onClick={e => { e.stopPropagation(); download([lbxIdx]) }}
                    disabled={downloading}
                  >{downloading ? `${progress}%` : '↓ Download'}</button>
                )}
                {isAdmin && (
                  <button
                    className="gal-btn gal-btn-delete"
                    onClick={e => {
                      e.stopPropagation()
                      if (confirm(`Delete ${photo.filename}? This cannot be undone.`)) deletePhoto(lbxIdx)
                    }}
                    disabled={deleting}
                  >{deleting ? deleteMsg || 'Deleting…' : '✕ Delete'}</button>
                )}
              </div>
            </div>
          </div>
          </>
        )
      })()}
    </div>
  )
}
