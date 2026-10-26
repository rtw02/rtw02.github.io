/**
 * One-time script: uploads mission-2026 photos to Vercel Blob
 * and writes src/data/blob-urls.json with the resulting URLs.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... npx tsx scripts/upload-to-blob.ts
 */

import { put } from '@vercel/blob'
import { readdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

const GALLERY = 'mission-2026'
const PHOTOS_DIR = path.join(process.cwd(), 'private-photos', 'galleries', GALLERY)
const OUT_FILE = path.join(process.cwd(), 'src', 'data', 'blob-urls.json')

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Missing BLOB_READ_WRITE_TOKEN')
    process.exit(1)
  }

  const files = (await readdir(PHOTOS_DIR)).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).sort()
  console.log(`Uploading ${files.length} photos…`)

  const urls: Record<string, string> = {}
  let done = 0

  for (const filename of files) {
    const filePath = path.join(PHOTOS_DIR, filename)
    const data = await readFile(filePath)
    const blobPath = `galleries/${GALLERY}/${filename}`

    const { url } = await put(blobPath, data, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'image/jpeg',
    })

    urls[`${GALLERY}/${filename}`] = url
    done++
    process.stdout.write(`\r  ${done}/${files.length} — ${filename}`)
  }

  console.log('\nWriting blob-urls.json…')
  await writeFile(OUT_FILE, JSON.stringify(urls, null, 2))
  console.log(`Done. ${done} photos uploaded.`)
  console.log(`URLs saved to src/data/blob-urls.json`)
}

main().catch(err => { console.error(err); process.exit(1) })
