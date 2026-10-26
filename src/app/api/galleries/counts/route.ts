import { NextResponse } from 'next/server'
import { galleries } from '@/data/galleries'
import { getLiveCount } from '@/lib/blob-photos'

export async function GET() {
  const entries = await Promise.all(
    galleries.map(async g => [g.slug, await getLiveCount(g.slug, g.photos)] as const)
  )
  return NextResponse.json(Object.fromEntries(entries), {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
