'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Lenis from 'lenis'
import { WORKS } from './works'
import type { Shared } from './Scene'

const Scene = dynamic(() => import('./Scene'), { ssr: false })

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')))
  } catch { return false }
}

export default function ExperienceClient() {
  const shared = useRef<Shared>({ progress: 0, mx: 0, my: 0, emx: 0, emy: 0, activeIdx: -1 })
  const [ok, setOk] = useState<boolean | null>(null)
  const [reduce, setReduce] = useState(false)

  // overlay refs (updated imperatively each frame — no re-render churn)
  const heroRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const outroRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const capRef = useRef<HTMLDivElement>(null)
  const capIdxRef = useRef<HTMLDivElement>(null)
  const capTitleRef = useRef<HTMLDivElement>(null)
  const capMetaRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    setOk(hasWebGL())
  }, [])

  useEffect(() => {
    if (!ok) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const lenis = new Lenis({ smoothWheel: !reduced, lerp: reduced ? 1 : 0.1 })

    const onPointer = (e: PointerEvent) => {
      shared.current.mx = e.clientX / window.innerWidth - 0.5
      shared.current.my = e.clientY / window.innerHeight - 0.5
      const c = cursorRef.current
      if (c) { c.style.opacity = '1'; c.style.transform = `translate(${e.clientX}px,${e.clientY}px)` }
    }
    window.addEventListener('pointermove', onPointer)

    let lastIdx = -2
    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      // Drive progress off real scroll position (Lenis moves native scroll, so
      // scrollY reflects the smoothed value). Robust regardless of lenis.limit.
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      shared.current.progress = p

      if (barRef.current) barRef.current.style.width = p * 100 + '%'
      const hf = Math.max(0, 1 - p * 7)
      if (heroRef.current) { heroRef.current.style.opacity = String(hf); heroRef.current.style.transform = `translateY(${-p * 60}px)` }
      if (hintRef.current) hintRef.current.style.opacity = String(hf)
      if (outroRef.current) outroRef.current.style.opacity = String(p > 0.9 ? Math.min(1, (p - 0.9) * 12) : 0)

      const idx = shared.current.activeIdx
      if (capRef.current) capRef.current.style.opacity = idx >= 0 ? '1' : '0'
      if (idx >= 0 && idx !== lastIdx) {
        lastIdx = idx
        const w = WORKS[idx]
        if (capIdxRef.current) capIdxRef.current.textContent = String(idx + 1).padStart(2, '0')
        if (capTitleRef.current) capTitleRef.current.textContent = w.title
        if (capMetaRef.current) capMetaRef.current.innerHTML = w.meta.replace(' · ', '<br>')
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
      lenis.destroy()
    }
  }, [ok])

  // marquee content
  const marquee = []
  for (let r = 0; r < 2; r++) {
    WORKS.forEach((w, i) => marquee.push(
      <span key={`${r}-${i}`}><b>{String(i + 1).padStart(2, '0')}</b> &nbsp; {w.title}</span>
    ))
    marquee.push(<span key={`${r}-x`}>— &nbsp; Available for commissions</span>)
  }

  if (ok === false) {
    return (
      <div className="exp-fallback">
        <div className="exp-mark" style={{ fontSize: '1.8rem', color: 'var(--exp-fg)', marginBottom: '1rem' }}>Ryan Wong</div>
        WebGL isn’t available here — the live site falls back to a static cinematic hero.
      </div>
    )
  }

  return (
    <div className="exp-root">
      {ok && <Scene shared={shared} reduce={reduce} />}

      <svg className="exp-grain" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <filter id="expnoise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /></filter>
        <rect width="100%" height="100%" filter="url(#expnoise)" />
      </svg>
      <div className="exp-vignette" aria-hidden="true" />

      <div className="exp-progress" ref={barRef} />

      <header className="exp-topbar">
        <div className="exp-mark">Ryan Wong<b>.</b></div>
        <div className="exp-tag">Prototype</div>
      </header>

      {/* scroll track — drives everything */}
      <div className="exp-track" />

      <section className="exp-hero" ref={heroRef}>
        <div className="exp-eyebrow" style={{ marginBottom: '1.4rem' }}>Cinematography — Portfolio</div>
        <h1>Light, <em>in</em><br />motion</h1>
        <p>A scroll-driven journey through selected frames, rendered in real 3D space.</p>
      </section>

      <div className="exp-hint" ref={hintRef}>Scroll<span /></div>

      <div className="exp-caption" ref={capRef} style={{ opacity: 0 }}>
        <div className="exp-capblock">
          <div className="exp-idx" ref={capIdxRef}>01</div>
          <div className="exp-ttl" ref={capTitleRef}>Mission</div>
        </div>
        <div className="exp-meta exp-capblock" ref={capMetaRef}>New York City<br />Oct 2026</div>
      </div>

      <section className="exp-outro" ref={outroRef}>
        <div className="exp-eyebrow" style={{ marginBottom: '1.2rem' }}>Enter the work</div>
        <h2>See every frame</h2>
        <a className="exp-cta" href="/galleries">View galleries →</a>
      </section>

      <div className="exp-marquee"><div className="exp-row">{marquee}</div></div>

      <div className="exp-cursor" ref={cursorRef} style={{ opacity: 0 }} />
    </div>
  )
}
