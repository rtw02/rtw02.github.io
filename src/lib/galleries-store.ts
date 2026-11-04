import { readFile } from 'fs/promises'
import path from 'path'
import type { Gallery } from '@/data/galleries'

// Gallery catalog is NOT hardcoded in the repo. Source of truth is catalog.json
// in Vercel Blob (uploaded by the ingest pipeline); a gitignored local copy at
// private-photos/catalog.json is the offline/dev fallback.

let cache: { at: number; data: Gallery[] } | null = null
const TTL = 60_000 // ms

export async function loadGalleries(): Promise<Gallery[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.data
  const data = (await fromBlob()) ?? (await fromLocal()) ?? []
  cache = { at: Date.now(), data }
  return data
}

export async function findGallery(slug: string): Promise<Gallery | undefined> {
  return (await loadGalleries()).find(g => g.slug === slug)
}

async function fromBlob(): Promise<Gallery[] | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return null
  try {
    const listRes = await fetch(
      'https://blob.vercel-storage.com/?prefix=catalog.json&limit=1',
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    )
    if (!listRes.ok) return null
    const { blobs } = await listRes.json()
    const url = blobs?.[0]?.url as string | undefined
    if (!url) return null
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as Gallery[]
  } catch {
    return null
  }
}

async function fromLocal(): Promise<Gallery[] | null> {
  try {
    const raw = await readFile(path.join(process.cwd(), 'private-photos', 'catalog.json'), 'utf-8')
    return JSON.parse(raw) as Gallery[]
  } catch {
    return null
  }
}
