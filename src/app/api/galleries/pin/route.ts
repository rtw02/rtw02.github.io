import { NextRequest, NextResponse } from 'next/server'
import { getAllGalleryPins, setGalleryPin } from '@/lib/gallery-pins'

function authed(request: NextRequest) {
  const session = request.cookies.get('rw-session')
  return process.env.DASHBOARD_SECRET && session?.value === process.env.DASHBOARD_SECRET
}

export async function GET(request: NextRequest) {
  if (!authed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const pins = await getAllGalleryPins()
  return NextResponse.json(pins)
}

export async function POST(request: NextRequest) {
  if (!authed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { slug, pin } = await request.json()
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  try {
    await setGalleryPin(slug, pin || null)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'KV not configured — set GALLERY_PIN env vars manually' }, { status: 503 })
  }
}
