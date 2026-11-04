/**
 * One-time script: uploads mission-2026 photos to Vercel Blob
 * and writes src/data/blob-urls.json with the resulting URLs.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... npx tsx scripts/upload-to-blob.ts
 */

import { put } from '@vercel/blob'
import { readdir, readFile, writeFile } from 'fs/promises'
import { readFileSync } from 'fs'
import path from 'path'

// Load .env.local if token not already in environment
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  try {
    const env = readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8')
    for (const line of env.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {}
}

const GALLERIES_DIR = path.join(process.cwd(), 'private-photos', 'galleries')
const OUT_FILE = path.join(process.cwd(), 'src', 'data', 'blob-urls.json')

async function uploadGallery(gallery: string, existing: Record<string, string>): Promise<Record<string, string>> {
  const dir = path.join(GALLERIES_DIR, gallery)
  const files = (await readdir(dir)).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).sort()
  console.log(`\n${gallery}: ${files.length} photos`)

  let done = 0
  for (const filename of files) {
    const key = `${gallery}/${filename}`
    if (existing[key]) {
      done++
      process.stdout.write(`\r  ${done}/${files.length} — ${filename} (skipped)`)
      continue
    }
    const data = await readFile(path.join(dir, filename))
    const { url } = await put(`galleries/${key}`, data, {
      access: 'private' as const,
      addRandomSuffix: false,
      contentType: 'image/jpeg',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    existing[key] = url
    done++
    process.stdout.write(`\r  ${done}/${files.length} — ${filename}`)
  }
  return existing
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Missing BLOB_READ_WRITE_TOKEN')
    process.exit(1)
  }

  // Load existing blob-urls.json to skip already-uploaded photos
  let urls: Record<string, string> = {}
  try {
    const raw = await readFile(OUT_FILE, 'utf-8')
    urls = JSON.parse(raw)
    console.log(`Loaded ${Object.keys(urls).length} existing blob URLs`)
  } catch { /* first run */ }

  // Upload all galleries found in private-photos/galleries/
  const galleries = (await readdir(GALLERIES_DIR)).filter(async name => {
    try { return (await import('fs/promises').then(m => m.stat(path.join(GALLERIES_DIR, name)))).isDirectory() }
    catch { return false }
  })

  // Simpler: just readdir and check
  const { stat } = await import('fs/promises')
  const allEntries = await readdir(GALLERIES_DIR)
  const galleryDirs: string[] = []
  for (const entry of allEntries) {
    try {
      const s = await stat(path.join(GALLERIES_DIR, entry))
      if (s.isDirectory()) galleryDirs.push(entry)
    } catch {}
  }

  for (const gallery of galleryDirs) {
    urls = await uploadGallery(gallery, urls)
  }

  // Upload the catalog manifest — the site's source of truth (read by
  // src/lib/galleries-store.ts). Always re-uploaded so edits propagate.
  try {
    const catalog = await readFile(path.join(process.cwd(), 'private-photos', 'catalog.json'))
    const { url } = await put('catalog.json', catalog, {
      access: 'private' as const,
      addRandomSuffix: false,
      contentType: 'application/json',
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    urls['catalog.json'] = url
    console.log('\nUploaded catalog.json')
  } catch {
    console.warn('\nNo private-photos/catalog.json found — skipped catalog upload')
  }

  console.log('\nWriting blob-urls.json…')
  await writeFile(OUT_FILE, JSON.stringify(urls, null, 2))
  console.log(`Done. ${Object.keys(urls).length} total URLs saved.`)
}

main().catch(err => { console.error(err); process.exit(1) })
