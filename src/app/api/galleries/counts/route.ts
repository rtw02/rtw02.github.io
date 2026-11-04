import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { loadGalleries } from '@/lib/galleries-store'
import { getLiveCount } from '@/lib/blob-photos'

// Live per-gallery photo counts for the admin dashboard. Each call fans out to
// one blob-list request per gallery, so it is admin-only to prevent an
// unauthenticated caller from amplifying blob API usage (cost).
export async function GET() {
  const session = (await cookies()).get('rw-session')
  if (!process.env.DASHBOARD_SECRET || session?.value !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
