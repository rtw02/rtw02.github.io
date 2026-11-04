'use client'

import { useEffect, useRef } from 'react'

/**
 * Photography loading screen: bokeh light circles drift in and coalesce into a
 * focused "R.W", then a hexagonal aperture iris opens from the centre to reveal
 * the page. Progress tracks REAL asset loading (the passed image srcs), floored
 * by a minimum duration so the animation always plays cleanly, and capped so a
 * failed/slow asset can never hang the screen.
 */
export default function Loader({ srcs, onDone }: { srcs: string[]; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const DPR = Math.min(2, window.devicePixelRatio || 1)
    const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches
    const MIN_MS = 2500     // minimum on-screen time (longer so the iris opens slowly)
    const MAX_MS = 8000     // hard cap so a stuck asset never traps the user

    // ---- real load tracking -------------------------------------------------
    let loaded = 0
    const total = Math.max(1, srcs.length)
    srcs.forEach((src) => {
      const img = new Image()
      const bump = () => { loaded++ }
      img.onload = bump
      img.onerror = bump
      img.src = src
      // decode() where available for a truer "ready" signal
      if (img.decode) img.decode().then(bump).catch(() => {})
    })

    // ---- bokeh target: sample points from "R.W" -----------------------------
    const W = 420, H = 150
    const tc = document.createElement('canvas'); tc.width = W; tc.height = H
    const tx = tc.getContext('2d')!
    tx.fillStyle = '#fff'; tx.textAlign = 'center'; tx.textBaseline = 'middle'
    tx.font = `700 ${Math.round(H * 0.6)}px Georgia, serif`
    tx.fillText('R.W', W / 2, H / 2 + 4)
    const data = tx.getImageData(0, 0, W, H).data
    const targets: Array<{ x: number; y: number }> = []
    for (let i = 0; i < 6000 && targets.length < 160; i++) {
      const px = (Math.random() * W) | 0, py = (Math.random() * H) | 0
      if (data[(py * W + px) * 4 + 3] > 128) targets.push({ x: px / W - 0.5, y: py / H - 0.5 })
    }
    const parts = targets.map((t) => ({ tx: t.x, ty: t.y, x0: Math.random() - 0.5, y0: Math.random() - 0.5 }))

    const ease = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)   // decelerate — aperture settle

    let w = 0, h = 0
    const resize = () => {
      w = Math.round(innerWidth * DPR); h = Math.round(innerHeight * DPR)
      canvas.width = w; canvas.height = h
    }
    resize(); addEventListener('resize', resize)

    let raf = 0
    const start = performance.now()
    let shown = 0

    const finish = () => {
      if (doneRef.current) return
      doneRef.current = true
      cancelAnimationFrame(raf); removeEventListener('resize', resize)
      onDone()
    }

    const frame = (now: number) => {
      const el = now - start
      const real = REDUCED ? 1 : Math.min(loaded / total, 1)
      // target: never ahead of real load, never faster than MIN, forced done by MAX
      let target = Math.min(real, el / MIN_MS)
      if (el >= MAX_MS) target = 1
      if (real >= 1 && el >= MIN_MS) target = 1
      shown += (target - shown) * 0.12
      if (target >= 0.999 && shown > 0.994) shown = 1
      const t = REDUCED ? 1 : ease(shown)

      const cx = w / 2, cy = h / 2
      const minD = Math.min(w, h)

      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#0a0a0c'; ctx.fillRect(0, 0, w, h)

      const p1 = Math.min(t / 0.5, 1)             // bokeh converge + sharpen
      const p2 = Math.max(0, (t - 0.45) / 0.55)   // iris opens — bigger, slower share

      // bokeh particles, fading out as the iris takes over
      const scale = minD * 0.42
      const bokehAlpha = (0.12 + 0.6 * p1) * (1 - p2)
      if (bokehAlpha > 0.01) {
        ctx.globalCompositeOperation = 'lighter'
        for (const p of parts) {
          const e = ease(p1)
          const x = cx + (p.x0 + (p.tx - p.x0) * e) * scale
          const y = cy + (p.y0 + (p.ty - p.y0) * e) * scale
          const rad = (1 - p1) * minD * 0.06 + 2.2
          const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
          g.addColorStop(0, `rgba(255,224,180,${bokehAlpha})`)
          g.addColorStop(0.7, `rgba(214,96,42,${bokehAlpha * 0.5})`)
          g.addColorStop(1, 'rgba(214,96,42,0)')
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill()
        }
        ctx.globalCompositeOperation = 'source-over'
      }

      // crisp "R.W" settling in as particles land, before the iris opens
      const logoA = Math.max(0, Math.min((p1 - 0.75) / 0.25, 1)) * (1 - p2)
      if (logoA > 0.01) {
        ctx.save()
        ctx.globalAlpha = logoA
        ctx.fillStyle = '#ece7df'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.font = `400 ${Math.round(minD * 0.14)}px Georgia, serif`
        ctx.fillText('R.W', cx, cy)
        ctx.restore()
      }

      // aperture iris — carve a growing hexagon hole to reveal the page beneath
      if (p2 > 0) {
        const op = easeOut(p2)
        const r = op * (Math.hypot(w, h) / 2) * 1.02
        const rot = -Math.PI / 2 + (1 - op) * 0.6
        ctx.save()
        ctx.globalCompositeOperation = 'destination-out'
        ctx.beginPath()
        for (let i = 0; i <= 6; i++) {
          const a = rot + i * Math.PI / 3
          const fn = i ? 'lineTo' : 'moveTo'
          ctx[fn](cx + r * Math.cos(a), cy + r * Math.sin(a))
        }
        ctx.closePath(); ctx.fill()
        ctx.restore()
        // blade glint on the opening edge
        ctx.strokeStyle = `rgba(236,231,223,${0.22 * (1 - p2)})`; ctx.lineWidth = 1.5 * DPR
        ctx.beginPath()
        for (let i = 0; i <= 6; i++) {
          const a = rot + i * Math.PI / 3
          const fn = i ? 'lineTo' : 'moveTo'
          ctx[fn](cx + r * Math.cos(a), cy + r * Math.sin(a))
        }
        ctx.stroke()
      }

      // f-stop readout, bottom-left, fading as the iris finishes
      const readA = 1 - p2
      if (readA > 0.01) {
        ctx.save()
        ctx.globalAlpha = readA
        ctx.fillStyle = '#8a847c'
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
        ctx.font = `500 ${Math.round(13 * DPR)}px Archivo, Arial, sans-serif`
        const fstop = (22 - t * 20.6).toFixed(1)
        ctx.fillText(`ƒ/${fstop}   1/250   ISO 100`, 24 * DPR, h - 28 * DPR)
        ctx.restore()
      }

      if (shown >= 1) { finish(); return }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize) }
  }, [srcs, onDone])

  return <canvas ref={canvasRef} className="loader-canvas" aria-hidden="true" />
}
