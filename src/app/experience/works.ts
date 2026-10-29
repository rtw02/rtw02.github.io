// Selected works shown in the /experience corridor.
//
// By default the flying planes use each gallery's ALBUM COVER (same-origin, no
// CORS). If `EXPERIENCE_PHOTOS` is populated with Ryan-approved mission filenames,
// those take priority. Covers are already public on /galleries, so no new exposure.

import { galleries } from '@/data/galleries'
import { EXPERIENCE_SLUG, EXPERIENCE_PHOTOS } from '@/lib/experience-photos'

export type Work = {
  title: string
  meta: string
  /** HSL triplets [hue, sat, light] — fallback tint if an image fails to load. */
  a: [number, number, number]
  b: [number, number, number]
  src?: string
}

const TINTS: Array<{ a: Work['a']; b: Work['b'] }> = [
  { a: [18, 0.55, 0.12], b: [6, 0.3, 0.03] },
  { a: [212, 0.45, 0.14], b: [220, 0.5, 0.04] },
  { a: [34, 0.6, 0.16], b: [14, 0.4, 0.05] },
  { a: [128, 0.3, 0.14], b: [150, 0.35, 0.04] },
  { a: [268, 0.4, 0.13], b: [250, 0.45, 0.04] },
  { a: [20, 0.65, 0.18], b: [8, 0.5, 0.05] },
]

// one plane per gallery cover
const COVERS: Work[] = galleries.map((g, i) => ({
  title: g.title,
  meta: `${g.subtitle} · ${g.date}`,
  a: TINTS[i % TINTS.length].a,
  b: TINTS[i % TINTS.length].b,
  src: g.cover,
}))

// Repeat the cover set so the corridor has depth (covers cycle, never adjacent dupes).
function fill(src: Work[], min: number): Work[] {
  if (src.length === 0) return src
  const n = Math.max(min, src.length)
  return Array.from({ length: n }, (_, i) => src[i % src.length])
}

// approved mission photos (ungated via the allowlist)
const MISSION: Work[] = EXPERIENCE_PHOTOS.map((file, i) => ({
  title: 'Mission',
  meta: 'New York City · Oct 2026',
  a: TINTS[i % TINTS.length].a,
  b: TINTS[i % TINTS.length].b,
  src: `/api/photo/${EXPERIENCE_SLUG}/${file}`,
}))

// mission photos first, then gallery covers, cycled so the corridor stays full
export const WORKS: Work[] = fill([...MISSION, ...COVERS], 8)

export const GAP = 5.4
export const Z_START = 9
export const Z_END = -4 - (WORKS.length - 1) * GAP - 6
