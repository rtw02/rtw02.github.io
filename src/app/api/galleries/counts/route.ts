import { NextResponse } from 'next/server'
import { loadGalleries } from '@/lib/galleries-store'
import { getLiveCount } from '@/lib/blob-photos'

export async function GET() {
  const galleries = await loadGalleries()
  const entries = await Promise.all(
    galleries.map(async g => [g.slug, await getLiveCount(g.slug, g.photos)] as const)
  )
  return NextResponse.json(Object.fromEntries(entries), {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
