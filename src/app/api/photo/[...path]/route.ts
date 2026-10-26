import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
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
  const filePath = path.join(process.cwd(), 'private-photos', 'galleries', ...clean)

  // Must stay within private-photos/galleries
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
        'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}

export const runtime = 'nodejs'
