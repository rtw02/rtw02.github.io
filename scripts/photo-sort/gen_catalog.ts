/**
 * Emit the current galleries catalog to private-photos/catalog.json.
 * This JSON becomes the source of truth (uploaded to Blob); the repo no longer
 * hardcodes the photo data.
 *   npx tsx scripts/photo-sort/gen_catalog.ts
 */
import { galleries } from '../../src/data/galleries'
import { writeFileSync } from 'fs'
import path from 'path'

const out = path.join(process.cwd(), 'private-photos', 'catalog.json')
writeFileSync(out, JSON.stringify(galleries, null, 2))
console.log(`wrote ${out} — ${galleries.length} galleries, ${galleries.reduce((n, g) => n + g.photos.length, 0)} photos`)
