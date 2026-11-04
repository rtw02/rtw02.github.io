import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { loadGalleries } from '@/lib/galleries-store'

// Catalog metadata for the admin dashboard. This exposes every gallery's title,
// date and full photo list — including PIN-gated (private) galleries — so it is
// admin-only. Public pages read the catalog server-side, not through this route;
// photo bytes stay separately PIN-gated by /api/photo.
export async function GET() {
  const session = (await cookies()).get('rw-session')
  if (!process.env.DASHBOARD_SECRET || session?.value !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const galleries = await loadGalleries()
  return NextResponse.json(galleries, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
