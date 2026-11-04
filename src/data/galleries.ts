export type Photo = {
  src: string
  alt: string
  filename: string
  w: number
  h: number
}

export type Gallery = {
  slug: string
  title: string
  subtitle: string
  date: string
  cover: string
  photos: Photo[]
}

// The catalog is no longer hardcoded here. Source of truth is catalog.json in
// Vercel Blob (fallback: private-photos/catalog.json), read via
// src/lib/galleries-store.ts -> loadGalleries(). This empty array is only a
// type-safe fallback for any stray import.
export const galleries: Gallery[] = []
