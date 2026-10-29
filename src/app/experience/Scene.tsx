'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { WORKS, GAP, Z_START, Z_END, type Work } from './works'

export type Shared = {
  progress: number
  mx: number
  my: number
  emx: number // eased
  emy: number
  activeIdx: number
}

// ---- procedural "graded still" placeholder texture ----
function hslHex(h: number, s: number, l: number) {
  const c = new THREE.Color()
  c.setHSL(h / 360, s, l)
  return '#' + c.getHexString()
}

function plateTexture(w: Work): THREE.Texture {
  const W = 512, H = 768
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const x = cv.getContext('2d')!
  const g = x.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, hslHex(w.a[0], w.a[1], w.a[2] + 0.1))
  g.addColorStop(0.55, hslHex(w.a[0], w.a[1], w.a[2]))
  g.addColorStop(1, hslHex(w.b[0], w.b[1], w.b[2]))
  x.fillStyle = g; x.fillRect(0, 0, W, H)
  const rg = x.createRadialGradient(W * 0.62, H * 0.3, 20, W * 0.62, H * 0.3, W * 0.9)
  rg.addColorStop(0, 'rgba(255,240,220,0.22)'); rg.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = rg; x.fillRect(0, 0, W, H)
  for (let i = 0; i < 9000; i++) {
    x.fillStyle = 'rgba(' + (Math.random() > 0.5 ? 255 : 0) + ',0,0,' + (Math.random() * 0.05) + ')'
    x.fillRect(Math.random() * W, Math.random() * H, 1, 1)
  }
  x.strokeStyle = 'rgba(255,255,255,0.10)'; x.lineWidth = 2; x.strokeRect(14, 14, W - 28, H - 28)
  x.fillStyle = 'rgba(236,231,223,0.85)'; x.font = '28px Georgia, serif'; x.fillText(w.title, 30, H - 34)
  x.fillStyle = 'rgba(236,231,223,0.5)'; x.font = '11px Archivo, sans-serif'
  x.fillText(w.meta.toUpperCase(), 34, 42)
  const t = new THREE.CanvasTexture(cv)
  t.anisotropy = 4
  return t
}

function Plates({ textures }: { textures: THREE.Texture[] }) {
  const geo = useMemo(() => new THREE.PlaneGeometry(3.1, 4.65, 1, 1), [])
  const meshes = useRef<THREE.Mesh[]>([])

  useFrame(() => {
    const t = performance.now() * 0.001
    meshes.current.forEach((m, i) => {
      if (!m) return
      const baseX = m.userData.baseX as number
      m.position.x = baseX + Math.sin(t * 0.4 + i) * 0.05
    })
  })

  return (
    <>
      {WORKS.map((w, i) => {
        const side = i % 2 === 0 ? -1 : 1
        const curve = i >= 4 ? (i - 3) * 0.8 : 0
        const baseX = side * 2.1 + side * curve
        return (
          <mesh
            key={i}
            ref={(el) => { if (el) { meshes.current[i] = el; el.userData.baseX = baseX } }}
            geometry={geo}
            position={[baseX, i % 2 ? 0.5 : -0.4, -4 - i * GAP]}
            rotation={[0, -side * 0.32 - (i >= 4 ? side * 0.12 : 0), 0]}
          >
            <meshBasicMaterial map={textures[i]} toneMapped={false} />
          </mesh>
        )
      })}
    </>
  )
}

function Rig({ shared, reduce }: { shared: React.MutableRefObject<Shared>; reduce: boolean }) {
  const { camera } = useThree()

  useFrame(() => {
    const s = shared.current
    if (reduce) {
      s.emx = s.mx; s.emy = s.my
    } else {
      s.emx += (s.mx - s.emx) * 0.06
      s.emy += (s.my - s.emy) * 0.06
    }
    camera.position.z = Z_START + (Z_END - Z_START) * s.progress
    camera.position.x = s.emx * 1.3
    camera.position.y = -s.emy * 0.8
    camera.lookAt(s.emx * 0.6, -s.emy * 0.4, camera.position.z - 8)

    // nearest plane → active caption index
    const camZ = camera.position.z
    let best = 0, bd = 1e9
    for (let i = 0; i < WORKS.length; i++) {
      const d = Math.abs((-4 - i * GAP + 2.2) - camZ)
      if (d < bd) { bd = d; best = i }
    }
    s.activeIdx = (s.progress > 0.04 && s.progress < 0.9 && bd < 7) ? best : -1
  })

  return null
}

export default function Scene({
  shared,
  reduce,
  fixed = true,
}: {
  shared: React.MutableRefObject<Shared>
  reduce: boolean
  /** true = cover the whole viewport (standalone route); false = fill parent (inline section). */
  fixed?: boolean
}) {
  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader()
    return WORKS.map((w) => {
      if (w.src) {
        const t = loader.load(w.src)
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 4
        return t
      }
      return plateTexture(w)
    })
  }, [])

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, Z_START], fov: 52, near: 0.1, far: 100 }}
      gl={{ antialias: true }}
      style={{ position: fixed ? 'fixed' : 'absolute', inset: 0, zIndex: 0 }}
    >
      <color attach="background" args={['#050507']} />
      <fogExp2 attach="fog" args={['#050507', 0.062]} />
      <Plates textures={textures} />
      <Rig shared={shared} reduce={reduce} />
    </Canvas>
  )
}
