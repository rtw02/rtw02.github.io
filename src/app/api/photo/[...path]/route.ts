import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { readFileSync } from 'fs'
import { cookies } from 'next/headers'
import path from 'path'
import { getGalleryPin } from '@/lib/gallery-pins'

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

  // Check gallery PIN — allow if no PIN set, or session is admin, or gallery cookie matches
  const requiredPin = await getGalleryPin(slug)
  if (requiredPin) {
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

  // Try Blob first — proxy privately (store is private, token required)
  const urls = getBlobUrls()
  if (urls[key]) {
    const blobRes = await fetch(urls[key], {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    })
    if (!blobRes.ok) return new NextResponse('Not found', { status: 404 })
    return new NextResponse(blobRes.body, {
      status: 200,
      headers: {
        'Content-Type': mimeType(key),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
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
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}

export const runtime = 'nodejs'
