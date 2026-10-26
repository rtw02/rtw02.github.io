'use client'

import { useEffect, useRef } from 'react'

export default function Cursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dot  = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let mx = window.innerWidth / 2, my = window.innerHeight / 2
    let rx = mx, ry = my
    let rafId: number

    const onMove  = (e: MouseEvent) => { mx = e.clientX; my = e.clientY }
    const onLeave = () => { dot!.style.opacity = '0'; ring!.style.opacity = '0' }
    const onEnter = () => { dot!.style.opacity = '1'; ring!.style.opacity = '1' }

    function loop() {
      dot!.style.left = mx + 'px'
      dot!.style.top  = my + 'px'
      rx += (mx - rx) * 0.07
      ry += (my - ry) * 0.07
      ring!.style.left = rx + 'px'
      ring!.style.top  = ry + 'px'
      rafId = requestAnimationFrame(loop)
    }
    loop()

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
    }
  }, [])

  return (
    <>
      <div ref={dotRef}  id="c-dot"  aria-hidden="true" />
      <div ref={ringRef} id="c-ring" aria-hidden="true" />
    </>
  )
}
