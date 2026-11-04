import { Link } from 'next-view-transitions'
import { loadGalleries } from '@/lib/galleries-store'
import { getLiveFilenames, filterLive } from '@/lib/blob-photos'
import GalleryCard from './GalleryCard'

export const metadata = { title: 'Galleries — Ryan Wong' }
export const dynamic = 'force-dynamic'

export default async function GalleriesPage() {
  const galleries = await loadGalleries()
  // resolve each gallery's LIVE photos once (used for the count + the preload list)
  const live = await Promise.all(galleries.map(g => getLiveFilenames(g.slug)))
  const data = galleries.map((g, i) => {
    const photos = filterLive(g.photos, live[i])
    return { g, srcs: photos.map(p => p.src), count: photos.length }
  })

  return (
    <main className="gal-list-page">
      <div className="gal-list-header">
        <Link href="/" className="gal-back">← Back</Link>
        <h1 className="gal-list-title">Galleries</h1>
        <p className="gal-list-sub">{galleries.length} collections</p>
      </div>
      <div className="gal-list-grid">
        {data.map(({ g, srcs, count }) => (
          <GalleryCard
            key={g.slug}
            slug={g.slug}
            cover={g.cover}
            title={g.title}
            subtitle={g.subtitle}
            date={g.date}
            count={count}
            srcs={srcs}
          />
        ))}
      </div>
    </main>
  )
}
