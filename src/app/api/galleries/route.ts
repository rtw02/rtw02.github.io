import { NextResponse } from 'next/server'
import { loadGalleries } from '@/lib/galleries-store'

// Catalog metadata for client components (e.g. the dashboard). Photo bytes are
// still served + PIN-gated by /api/photo; this only returns titles/dates/lists.
export async function GET() {
  const galleries = await loadGalleries()
  return NextResponse.json(galleries, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
