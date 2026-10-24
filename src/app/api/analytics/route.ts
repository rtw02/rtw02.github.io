import { NextRequest, NextResponse } from 'next/server'

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
    const kv = await getKV()
    if (!kv) return NextResponse.json({ ok: false, reason: 'kv-not-configured' })

    const now = Date.now()

    if (event === 'view') {
      await kv.hincrby('gallery:views', gallery, 1)
      await kv.lpush('events:recent', JSON.stringify({ type: 'view', gallery, ts: now }))
      await kv.ltrim('events:recent', 0, 99)
    }

    if (event === 'download') {
      await kv.hincrby('gallery:downloads', gallery, count ?? 1)
      await kv.incrby('total:downloads', count ?? 1)
      await kv.lpush('events:recent', JSON.stringify({ type: 'download', gallery, count, ts: now }))
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
