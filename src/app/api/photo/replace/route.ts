import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { cookies } from 'next/headers'
import path from 'path'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const session = cookieStore.get('rw-session')
  if (session?.value !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fd = await request.formData()
  const file = fd.get('file') as File | null
  const slug = fd.get('slug') as string | null
  const filename = fd.get('filename') as string | null

  if (!file || !slug || !filename) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Sanitize inputs
  const cleanSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '')
  const cleanFilename = filename.replace(/\.\./g, '').replace(/[^a-zA-Z0-9._-]/g, '_')

  const destPath = path.join(process.cwd(), 'private-photos', 'galleries', cleanSlug, cleanFilename)
  const base = path.join(process.cwd(), 'private-photos', 'galleries')
  if (!destPath.startsWith(base)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(destPath, buffer)

  return NextResponse.json({ ok: true })
}

export const runtime = 'nodejs'
