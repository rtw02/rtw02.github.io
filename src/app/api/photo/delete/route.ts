import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { cookies } from 'next/headers'
import path from 'path'

function getBlobUrls(): Record<string, string> {
  try {
    const raw = readFileSync(path.join(process.cwd(), 'src', 'data', 'blob-urls.json'), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export async function DELETE(request: NextRequest) {
  // Admin-only
  const cookieStore = await cookies()
  const session = cookieStore.get('rw-session')
  if (!process.env.DASHBOARD_SECRET || session?.value !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let slug: string, filename: string
  try {
    const body = await request.json()
    slug = body.slug
    filename = body.filename
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!slug || !filename) {
    return NextResponse.json({ error: 'Missing slug or filename' }, { status: 400 })
  }

  // Sanitize
  const cleanSlug = slug.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_-]/g, '')
  const cleanFile = filename.replace(/\.\./g, '').replace(/[^a-zA-Z0-9._-]/g, '')
  const key = `${cleanSlug}/${cleanFile}`

  const urls = getBlobUrls()
  const blobUrl = urls[key]

  if (!blobUrl) {
    return NextResponse.json({ error: 'Photo not found in blob store' }, { status: 404 })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Blob token not configured' }, { status: 500 })
  }

  // Call Vercel Blob REST API directly (avoids webpack bundling @vercel/blob + undici)
  const res = await fetch('https://vercel.com/api/blob/delete', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-api-version': '7',
    },
    body: JSON.stringify({ urls: [blobUrl] }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('Blob delete failed:', res.status, text)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export const runtime = 'nodejs'
