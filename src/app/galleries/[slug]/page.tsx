'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { galleries } from '@/data/galleries'
import { notFound } from 'next/navigation'

export default function GalleryPage({ params }: { params: { slug: string } }) {
  const gallery = galleries.find(g => g.slug === params.slug)
  if (!gallery) notFound()

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [downloading, setDownloading] = useState(false)
  const [lbxIdx, setLbxIdx] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)

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

      // track analytics
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

  // keyboard nav for lightbox
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

  // track gallery view
  useEffect(() => {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'view', gallery: gallery.slug }),
    }).catch(() => {})
  }, [gallery.slug])

  const selectedArr = Array.from(selected)

  return (
    <>
      {/* HEADER */}
      <header className="gal-header">
        <Link href="/galleries" className="gal-back">← All Galleries</Link>
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
            {downloading ? `${progress}%` : 'Download All'}
          </button>
        </div>
      </header>

      {/* MASONRY GRID */}
      <main className="gal-masonry-wrap">
        <div className="gal-masonry">
          {gallery.photos.map((photo, i) => {
            const isSelected = selected.has(i)
            return (
              <div
                key={i}
                className={`gal-item${isSelected ? ' gal-item--selected' : ''}`}
                onClick={() => setLbxIdx(i)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.src} alt={photo.alt} className="gal-item-img" loading="lazy" />
                <div className="gal-item-overlay" />
                <button
                  className="gal-item-check"
                  aria-label={isSelected ? 'Deselect' : 'Select'}
                  onClick={e => { e.stopPropagation(); toggle(i) }}
                >
                  {isSelected ? '✓' : ''}
                </button>
              </div>
            )
          })}
        </div>
      </main>

      {/* SELECTION BAR */}
      {selected.size > 0 && (
        <div className="gal-sel-bar">
          <span className="gal-sel-count">{selected.size} selected</span>
          <div className="gal-sel-actions">
            <button className="gal-btn gal-btn-ghost" onClick={() => setSelected(new Set())}>Clear</button>
            <button
              className="gal-btn gal-btn-solid"
              onClick={() => download(selectedArr)}
              disabled={downloading}
            >
              {downloading ? `Downloading… ${progress}%` : `Download ${selected.size} Photo${selected.size > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {lbxIdx !== null && (() => {
        const photo = gallery.photos[lbxIdx]
        return (
          <div className="lbx" role="dialog" aria-modal onClick={() => setLbxIdx(null)}>
            <span className="lbx-counter">{String(lbxIdx + 1).padStart(2,'0')} / {String(gallery.photos.length).padStart(2,'0')}</span>
            <button className="lbx-close" onClick={() => setLbxIdx(null)}>✕</button>
            <button className="lbx-nav lbx-prev" onClick={e => { e.stopPropagation(); setLbxIdx((lbxIdx - 1 + gallery.photos.length) % gallery.photos.length) }}>←</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="lbx-img" src={photo.src} alt={photo.alt} onClick={e => e.stopPropagation()} />
            <button className="lbx-nav lbx-next" onClick={e => { e.stopPropagation(); setLbxIdx((lbxIdx + 1) % gallery.photos.length) }}>→</button>
            <div className="lbx-meta" onClick={e => e.stopPropagation()}>
              <div className="lbx-name">{photo.alt}</div>
              <button
                className="gal-btn gal-btn-ghost lbx-dl"
                onClick={e => { e.stopPropagation(); download([lbxIdx]) }}
              >↓ Download</button>
            </div>
          </div>
        )
      })()}
    </>
  )
}
