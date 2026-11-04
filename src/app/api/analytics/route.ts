import { NextRequest, NextResponse } from 'next/server'
import { loadGalleries } from '@/lib/galleries-store'

async function getKV() {
  try {
    const { kv } = await import('@vercel/kv')
    return kv
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { event, gallery, count } = await request.json()

    // This route is intentionally unauthenticated (public pages report view/
    // download events), so validate hard to stop abuse of the KV writes:
    //  - event must be a known type
    //  - gallery must be a real slug (prevents unbounded hash-key growth / cost)
    //  - count is clamped to a small positive integer (prevents total inflation)
    //  - a per-IP KV rate limit caps how many events one client can log
    // A Vercel WAF rate rule would be a stronger outer layer if abuse appears.
    if (event !== 'view' && event !== 'download') {
      return NextResponse.json({ ok: false, reason: 'bad-event' }, { status: 400 })
    }
    const slugs = new Set((await loadGalleries()).map(g => g.slug))
    if (typeof gallery !== 'string' || !slugs.has(gallery)) {
      return NextResponse.json({ ok: false, reason: 'unknown-gallery' }, { status: 400 })
    }
    const n = Number(count)
    const safeCount = Number.isFinite(n) ? Math.min(1000, Math.max(1, Math.floor(n))) : 1

    const kv = await getKV()
    if (!kv) return NextResponse.json({ ok: false, reason: 'kv-not-configured' })

    // Per-IP rate limit: fixed 60s window, 60 events max. Generous for a real
    // visitor (a page view + a few downloads) but caps automated spam cheaply
    // (reject after one INCR instead of 3-4 write ops per event).
    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
    const rlKey = `rl:analytics:${ip}`
    const hits = await kv.incr(rlKey)
    if (hits === 1) await kv.expire(rlKey, 60)
    if (hits > 60) return NextResponse.json({ ok: false, reason: 'rate-limited' }, { status: 429 })

    const now = Date.now()

    if (event === 'view') {
      await kv.hincrby('gallery:views', gallery, 1)
      await kv.lpush('events:recent', JSON.stringify({ type: 'view', gallery, ts: now }))
      await kv.ltrim('events:recent', 0, 99)
    }

    if (event === 'download') {
      await kv.hincrby('gallery:downloads', gallery, safeCount)
      await kv.incrby('total:downloads', safeCount)
      await kv.lpush('events:recent', JSON.stringify({ type: 'download', gallery, count: safeCount, ts: now }))
      await kv.ltrim('events:recent', 0, 99)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}

export async function GET(request: NextRequest) {
  const session = request.cookies.get('rw-session')
  if (!process.env.DASHBOARD_SECRET || session?.value !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const kv = await getKV()
    if (!kv) return NextResponse.json({ error: 'kv-not-configured' }, { status: 503 })

    const [views, downloads, totalDl, recent] = await Promise.all([
      kv.hgetall('gallery:views'),
      kv.hgetall('gallery:downloads'),
      kv.get<number>('total:downloads'),
      kv.lrange('events:recent', 0, 49),
    ])

    return NextResponse.json({ views, downloads, totalDownloads: totalDl ?? 0, recent })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
