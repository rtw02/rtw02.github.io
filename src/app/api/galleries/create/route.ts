import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  const session = request.cookies.get('rw-session')
  if (!process.env.DASHBOARD_SECRET || session?.value !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const title    = formData.get('title') as string
    const subtitle = formData.get('subtitle') as string
    const date     = formData.get('date') as string
    const slug     = formData.get('slug') as string
    const files    = formData.getAll('photos') as File[]

    if (!title || !slug || files.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Save photos to public/galleries/[slug]/
    const dir = path.join(process.cwd(), 'public', 'galleries', slug)
    await mkdir(dir, { recursive: true })

    const photos: { src: string; alt: string; filename: string }[] = []

    for (const file of files) {
      const bytes  = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const name   = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      await writeFile(path.join(dir, name), buffer)
      photos.push({
        src: `/galleries/${slug}/${name}`,
        alt: `${title} — ${date}`,
        filename: name,
      })
    }

    // Store gallery metadata in KV if available
    try {
      const { kv } = await import('@vercel/kv')
      const gallery = { slug, title, subtitle, date, cover: photos[0].src, photos }
      await kv.hset('dynamic-galleries', { [slug]: JSON.stringify(gallery) })
    } catch {
      // KV not configured — gallery exists on disk, just won't appear in list until redeployed
    }

    return NextResponse.json({ ok: true, slug, count: photos.length })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
