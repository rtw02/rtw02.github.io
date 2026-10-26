import { NextRequest, NextResponse } from 'next/server'
import { getGalleryPin } from '@/lib/gallery-pins'

export async function POST(request: NextRequest) {
  const { slug, pin } = await request.json()

  if (!slug || !pin) {
    return NextResponse.json({ error: 'Missing slug or pin' }, { status: 400 })
  }

  const requiredPin = await getGalleryPin(slug)

  if (!requiredPin) {
    return NextResponse.json({ error: 'Gallery not found or not protected' }, { status: 404 })
  }

  if (pin !== requiredPin) {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(`rw-gallery-${slug}`, requiredPin, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
