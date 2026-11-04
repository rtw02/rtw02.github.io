'use client'

import { useEffect, useRef } from 'react'
import { Link } from 'next-view-transitions'

/**
 * Gallery list card. Prefetches the gallery's photos into the browser cache so
 * they're ready the moment the cover-zoom transition fires:
 *  - on hover / focus / pointerdown → preload ALL of this gallery's photos
 *  - on idle after mount → warm the first few of every gallery (covers mobile taps)
 * Preloads are plain Image() requests; /api/photo is cached, so a second real
 * <img> request resolves instantly from cache.
 */
export default function GalleryCard({
  slug, cover, title, subtitle, date, count, srcs,
}: {
  slug: string; cover: string; title: string; subtitle: string
  date: string; count: number; srcs: string[]
}) {
  const warmed = useRef(false)

  const preloadAll = () => {
    if (warmed.current) return
    warmed.current = true
    for (const src of srcs) { const img = new Image(); img.src = src }
  }

  useEffect(() => {
    // warm the first few of every gallery when the browser is idle
    const warmTop = () => { for (const src of srcs.slice(0, 4)) { const img = new Image(); img.src = src } }
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
    if (ric) ric(warmTop)
    else setTimeout(warmTop, 1200)
  }, [srcs])

  return (
    <Link
      href={`/galleries/${slug}`}
      className="gal-card"
      onMouseEnter={preloadAll}
      onFocus={preloadAll}
      onPointerDown={preloadAll}
    >
      <div className="gal-card-img-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt={title}
          className="gal-card-img"
          loading="eager"
          fetchPriority="high"
          style={{ viewTransitionName: `gcover-${slug}` }}
        />
        <div className="gal-card-overlay" />
      </div>
      <div className="gal-card-info">
        <span className="gal-card-date">{date}</span>
        <h2 className="gal-card-name">{title}</h2>
        <span className="gal-card-loc">{subtitle} &nbsp;·&nbsp; {count} photos</span>
      </div>
    </Link>
  )
}
