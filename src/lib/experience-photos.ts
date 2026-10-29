// Photos explicitly approved for PUBLIC display on the /experience route.
//
// These keys bypass the gallery PIN gate in the photo proxy, so anything listed
// here is visible to anyone who opens /experience — no unlock required.
//
// TATTOO RULE: only add filenames Ryan has explicitly approved (no visible
// tattoos). Nothing is exposed until its exact key is in this list.

export const EXPERIENCE_SLUG = 'mission-2026'

// Ryan-approved, tattoo-free mission-2026 photos cleared for public display.
export const EXPERIENCE_PHOTOS: string[] = [
  'DSC07952.jpg',
  'DSC08206.jpg',
  'DSC08262.jpg',
  'DSC08284.jpg',
]

/** Set of `${slug}/${filename}` keys that the proxy serves without a PIN. */
export function experienceKeys(): Set<string> {
  return new Set(EXPERIENCE_PHOTOS.map((f) => `${EXPERIENCE_SLUG}/${f}`))
}
