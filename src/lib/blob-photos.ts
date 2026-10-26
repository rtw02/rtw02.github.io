import type { Photo } from '@/data/galleries'

// Live set of photo filenames that still exist in the Vercel Blob store for a
// gallery. One list call per gallery (not N HEAD requests). Returns null on any
// failure so callers fall back to the static catalog rather than hiding everything.
export async function getLiveFilenames(slug: string): Promise<Set<string> | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return null
  try {
    const res = await fetch(
      `https://blob.vercel-storage.com/?prefix=galleries/${encodeURIComponent(slug)}/&limit=1000`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    )
    if (!res.ok) return null
    const data = await res.json()
    const names = new Set<string>()
    for (const b of data.blobs ?? []) {
      const name = (b.pathname as string).split('/').pop()
      if (name) names.add(name)
    }
    return names
  } catch {
    return null
  }
}

export function filterLive(photos: Photo[], live: Set<string> | null): Photo[] {
  if (!live) return photos
  return photos.filter(p => live.has(p.filename))
}

// Live photo count for a gallery, derived from the blob store.
export async function getLiveCount(slug: string, photos: Photo[]): Promise<number> {
  const live = await getLiveFilenames(slug)
  return filterLive(photos, live).length
}
