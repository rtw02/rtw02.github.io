'use client'

import { useEffect, useRef } from 'react'
import { Link } from 'next-view-transitions'
import { useRouter } from 'next/navigation'

/**
 * Gallery list card. Warms the gallery ahead of the cover-zoom transition
 * WITHOUT starving the navigation itself:
 *  - on hover / focus → prefetch the route (RSC) + preload only the first few
 *    photos at LOW priority (so they don't compete with the page load)
 *  - on idle after mount → warm just the cover of every gallery (cheap)
 * The rest of the photos stream in after arrival (grid lazy-loads them); the
 * morph target + above-fold tiles are what need to be ready, not all 20+.
 */
export default function GalleryCard({
  slug, cover, title, subtitle, date, count, srcs,
}: {
  slug: string; cover: string; title: string; subtitle: string
  date: string; count: number; srcs: string[]
}) {
  const warmed = useRef(false)
  const router = useRouter()

  const warm = () => {
    if (warmed.current) return
    warmed.current = true
    router.prefetch(`/galleries/${slug}`)
    // only the above-fold tiles, at low priority, so the RSC/nav isn't starved
    for (const src of srcs.slice(0, 8)) {
      const img = new Image()
      img.setAttribute('fetchpriority', 'low')
      img.src = src
    }
  }

  useEffect(() => {
    // on idle, warm just this gallery's cover (very cheap, helps cold taps)
    const warmCover = () => { const img = new Image(); img.setAttribute('fetchpriority', 'low'); img.src = cover }
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
    if (ric) ric(warmCover)
    else setTimeout(warmCover, 1500)
  }, [cover])

  return (
    <Link
      href={`/galleries/${slug}`}
      className="gal-card"
      onMouseEnter={warm}
      onFocus={warm}
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
