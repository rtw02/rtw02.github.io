import Link from 'next/link'
import { galleries } from '@/data/galleries'

export const metadata = { title: 'Galleries — Ryan Wong' }

export default function GalleriesPage() {
  return (
    <main className="gal-list-page">
      <div className="gal-list-header">
        <Link href="/" className="gal-back">← Back</Link>
        <h1 className="gal-list-title">Galleries</h1>
        <p className="gal-list-sub">{galleries.length} collections</p>
      </div>
      <div className="gal-list-grid">
        {galleries.map(g => (
          <Link key={g.slug} href={`/galleries/${g.slug}`} className="gal-card">
            <div className="gal-card-img-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.cover} alt={g.title} className="gal-card-img" loading="eager" fetchPriority="high" />
              <div className="gal-card-overlay" />
            </div>
            <div className="gal-card-info">
              <span className="gal-card-date">{g.date}</span>
              <h2 className="gal-card-name">{g.title}</h2>
              <span className="gal-card-loc">{g.subtitle} &nbsp;·&nbsp; {g.photos.length} photos</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
