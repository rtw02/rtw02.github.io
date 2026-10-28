// Selected works shown in the /experience corridor.
//
// `src` is optional. Leave it undefined to render a procedural "graded still"
// placeholder (what the approved mock used). To use your real photos, set
// `src` to a same-origin proxy URL, e.g. "/api/photo/mission-2026/DSC07952.jpg"
// — same origin means the WebGL texture loads with no CORS issue.
//
// NOTE (tattoo rule): only point `src` at photos Ryan has explicitly approved.

export type Work = {
  title: string
  meta: string
  /** HSL triplets [hue, sat, light] for the procedural placeholder gradient. */
  a: [number, number, number]
  b: [number, number, number]
  src?: string
}

import { EXPERIENCE_SLUG, EXPERIENCE_PHOTOS } from '@/lib/experience-photos'

const BASE: Work[] = [
  { title: 'Mission',     meta: 'New York City · Oct 2026', a: [18, 0.55, 0.12],  b: [6, 0.3, 0.03] },
  { title: 'Golden Hour', meta: 'Rooftops · Summer',        a: [34, 0.6, 0.16],   b: [14, 0.4, 0.05] },
  { title: 'Blue Room',   meta: 'Interior · Night',         a: [212, 0.45, 0.14], b: [220, 0.5, 0.04] },
  { title: 'Static',      meta: 'Studio · Portrait',        a: [0, 0, 0.2],       b: [20, 0.1, 0.04] },
  { title: 'Verdant',     meta: 'Upstate · Field',          a: [128, 0.3, 0.14],  b: [150, 0.35, 0.04] },
  { title: 'Ember',       meta: 'Desert · Dusk',            a: [20, 0.65, 0.18],  b: [8, 0.5, 0.05] },
  { title: 'After Hours', meta: 'Subway · 2am',             a: [268, 0.4, 0.13],  b: [250, 0.45, 0.04] },
]

// When approved photos exist, render them; otherwise fall back to placeholders.
export const WORKS: Work[] =
  EXPERIENCE_PHOTOS.length > 0
    ? EXPERIENCE_PHOTOS.map((file, i) => ({
        ...BASE[i % BASE.length],
        src: `/api/photo/${EXPERIENCE_SLUG}/${file}`,
      }))
    : BASE

export const GAP = 5.4
export const Z_START = 9
export const Z_END = -4 - (WORKS.length - 1) * GAP - 6
