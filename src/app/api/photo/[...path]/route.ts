import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { readFileSync } from 'fs'
import { cookies } from 'next/headers'
import path from 'path'
import { getGalleryPin } from '@/lib/gallery-pins'
import { experienceKeys } from '@/lib/experience-photos'

// Blob URL map — populated by scripts/upload-to-blob.ts
let blobUrls: Record<string, string> | null = null
function getBlobUrls(): Record<string, string> {
  if (blobUrls) return blobUrls
  try {
    const raw = readFileSync(path.join(process.cwd(), 'src', 'data', 'blob-urls.json'), 'utf-8')
    blobUrls = JSON.parse(raw)
  } catch {
    blobUrls = {}
  }
  return blobUrls ?? {}
}

function mimeType(file: string): string {
  const ext = file.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp',
    heic: 'image/heic', gif: 'image/gif',
  }
  return map[ext ?? ''] ?? 'application/octet-stream'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params
  if (!segments || segments.length === 0) {
    return new NextResponse('Not found', { status: 404 })
  }

  // Sanitize: prevent path traversal
  const clean = segments.map(s => s.replace(/\.\./g, '').replace(/[^a-zA-Z0-9._-]/g, '_'))
  const slug = clean[0]
  const key = clean.join('/')

  // Check gallery PIN — allow if no PIN set, or session is admin, or gallery cookie
  // matches. Photos explicitly approved for /experience bypass the PIN entirely.
  const requiredPin = await getGalleryPin(slug)
  if (requiredPin && !experienceKeys().has(key)) {
    const cookieStore = await cookies()
    const session = cookieStore.get('rw-session')
    const isAdmin = session?.value === process.env.DASHBOARD_SECRET
    if (!isAdmin) {
      const galCookie = cookieStore.get(`rw-gallery-${slug}`)
      if (galCookie?.value !== requiredPin) {
        return new NextResponse('Unauthorized', { status: 401 })
      }
    }
  }

  // Try Blob first — proxy privately (store is private, token required).
  //
  // Caching order:
  //   1. Hit the blob store to confirm the photo still exists.
  //   2. Forward the client's If-None-Match so the store decides whether the
  //      cached copy is still current (ETag is the blob's content hash, i.e.
  //      it changes whenever the photo is re-uploaded).
  //   3. Blob gone              -> 404 (gallery drops it).
  //      Blob unchanged (304)   -> 304, browser reuses its cached image.
  //      Anything else          -> 200 fresh bytes + current ETag.
  // Cache-Control: private, no-cache keeps the copy but forces a revalidation
  // on every use, so a deleted or replaced blob is caught immediately.
  const urls = getBlobUrls()
  if (urls[key]) {
    const ifNoneMatch = request.headers.get('if-none-match')
    const blobRes = await fetch(urls[key], {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        ...(ifNoneMatch ? { 'If-None-Match': ifNoneMatch } : {}),
      },
      cache: 'no-store',
    })

    // Photo no longer in blob storage
    if (blobRes.status === 404) return new NextResponse('Not found', { status: 404 })

    const etag = blobRes.headers.get('etag') ?? ifNoneMatch ?? undefined
    const lastModified = blobRes.headers.get('last-modified') ?? undefined
    const revalidate: Record<string, string> = { 'Cache-Control': 'private, no-cache' }
    if (etag) revalidate['ETag'] = etag
    if (lastModified) revalidate['Last-Modified'] = lastModified

    // Cached copy still current — let the browser reuse it
    if (blobRes.status === 304) {
      return new NextResponse(null, { status: 304, headers: revalidate })
    }

    if (!blobRes.ok) return new NextResponse('Not found', { status: 404 })

    // Fresh bytes
    return new NextResponse(blobRes.body, {
      status: 200,
      headers: {
        'Content-Type': blobRes.headers.get('content-type') ?? mimeType(key),
        'X-Content-Type-Options': 'nosniff',
        ...revalidate,
      },
    })
  }

  // Fallback: serve from filesystem (local dev / before blob upload)
  const filePath = path.join(process.cwd(), 'private-photos', 'galleries', ...clean)
  const base = path.join(process.cwd(), 'private-photos', 'galleries')
  if (!filePath.startsWith(base)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const data = await readFile(filePath)
    const mime = mimeType(filePath)
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}

export const runtime = 'nodejs'
