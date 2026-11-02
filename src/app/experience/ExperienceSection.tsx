'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { WORKS } from './works'
import type { Shared, StereoMode } from './Scene'

const Scene = dynamic(() => import('./Scene'), { ssr: false })

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')))
  } catch { return false }
}

export default function ExperienceSection() {
  const shared = useRef<Shared>({ progress: 0, mx: 0, my: 0, emx: 0, emy: 0, activeIdx: -1 })
  const [ok, setOk] = useState<boolean | null>(null)
  const [reduce, setReduce] = useState(false)
  const [reflect, setReflect] = useState(false)
  const [stereo, setStereo] = useState<StereoMode>('none')

  const secRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const capRef = useRef<HTMLDivElement>(null)
  const capIdxRef = useRef<HTMLDivElement>(null)
  const capTitleRef = useRef<HTMLDivElement>(null)
  const capMetaRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    setOk(hasWebGL())
  }, [])

  useEffect(() => {
    if (!ok) return
    const onPointer = (e: PointerEvent) => {
      shared.current.mx = e.clientX / window.innerWidth - 0.5
      shared.current.my = e.clientY / window.innerHeight - 0.5
    }
    window.addEventListener('pointermove', onPointer)

    let lastIdx = -2
    let raf = 0
    const loop = () => {
      const sec = secRef.current
      if (sec) {
        const rect = sec.getBoundingClientRect()
        const max = sec.offsetHeight - window.innerHeight
        const p = max > 0 ? Math.min(1, Math.max(0, -rect.top / max)) : 0
        shared.current.progress = p

        if (barRef.current) barRef.current.style.width = p * 100 + '%'
        if (introRef.current) introRef.current.style.opacity = String(Math.max(0, 1 - p * 7))
        // dissolve the reel into the page at the first/last 6% of the section
        const edge = Math.min(1, Math.min(p, 1 - p) / 0.06)
        if (stageRef.current) stageRef.current.style.opacity = String(edge)

        const idx = shared.current.activeIdx
        if (capRef.current) capRef.current.style.opacity = idx >= 0 ? '1' : '0'
        if (idx >= 0 && idx !== lastIdx) {
          lastIdx = idx
          const w = WORKS[idx]
          if (capIdxRef.current) capIdxRef.current.textContent = String(idx + 1).padStart(2, '0')
          if (capTitleRef.current) capTitleRef.current.textContent = w.title
          if (capMetaRef.current) capMetaRef.current.innerHTML = w.meta.replace(' · ', '<br>')
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onPointer) }
  }, [ok])

  // no-WebGL: a short static band instead of a tall empty gap
  if (ok === false) {
    return (
      <section className="exp-sec exp-sec--static" aria-label="Immersive reel">
        <div className="exps-intro" style={{ position: 'relative' }}>
          <div className="exp-eyebrow">Selected Frames</div>
          <h2 className="exps-title">In motion</h2>
        </div>
      </section>
    )
  }

  return (
    <section className="exp-sec" ref={secRef} aria-label="Immersive reel">
      <div className="exp-stage" ref={stageRef}>
        {ok && <Scene shared={shared} reduce={reduce} fixed={false} reflect={reflect} stereo={stereo} />}

        {/* vignette only — pure darkening, no grain (grain was lifting the blacks) */}
        <div className="exps-vignette" aria-hidden="true" />

        {/* soft gradient seams so the top/bottom edges melt into the page */}
        <div className="exps-seam exps-seam--top" aria-hidden="true" />
        <div className="exps-seam exps-seam--bottom" aria-hidden="true" />

        <div className="exps-intro" ref={introRef}>
          <div className="exp-eyebrow">Selected Frames</div>
          <h2 className="exps-title">In motion</h2>
        </div>

        <div className="exps-caption" ref={capRef} style={{ opacity: 0 }}>
          <div>
            <div className="exp-idx" ref={capIdxRef}>01</div>
            <div className="exp-ttl" ref={capTitleRef}>Mission</div>
          </div>
          <div className="exp-meta" ref={capMetaRef}>New York City<br />Oct 2026</div>
        </div>

        <div className="exps-ctrl">
          <button type="button" className={reflect ? 'on' : ''} onClick={() => setReflect((v) => !v)}>Reflection</button>
          <button type="button" className={stereo === 'none' ? 'on' : ''} onClick={() => setStereo('none')}>2D</button>
          <button type="button" className={stereo === 'anaglyph' ? 'on' : ''} onClick={() => setStereo('anaglyph')}>Anaglyph</button>
          <button type="button" className={stereo === 'parallax' ? 'on' : ''} onClick={() => setStereo('parallax')}>Barrier</button>
        </div>

        <div className="exps-progress" ref={barRef} />
      </div>
    </section>
  )
}
