'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { galleries } from '@/data/galleries'

type AnalyticsData = {
  views: Record<string, number> | null
  downloads: Record<string, number> | null
  totalDownloads: number
  recent: string[]
}

type RecentEvent = {
  type: 'view' | 'download'
  gallery: string
  count?: number
  ts: number
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(setData)
      .catch(() => setErr('Failed to load analytics.'))
  }, [])

  const totalViews = data?.views
    ? Object.values(data.views).reduce((a, b) => a + (b as number), 0)
    : 0

  const recentEvents: RecentEvent[] = (data?.recent ?? [])
    .map(r => { try { return JSON.parse(r as string) } catch { return null } })
    .filter(Boolean)

  const galleryName = (slug: string) =>
    galleries.find(g => g.slug === slug)?.title ?? slug

  const fmtTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const maxViews = data?.views
    ? Math.max(...Object.values(data.views).map(Number), 1)
    : 1

  return (
    <main className="dash-page">
      {/* Header */}
      <div className="dash-hd">
        <div>
          <Link href="/" className="gal-back">← Site</Link>
          <h1 className="dash-name">Ryan Wong</h1>
          <p className="dash-sub">Analytics Dashboard</p>
        </div>
        <div className="dash-hd-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      </div>

      {err && <p className="dash-err">{err} Make sure Vercel KV is connected.</p>}

      {/* Stat cards */}
      <div className="dash-stats">
        <div className="dash-stat">
          <div className="dash-stat-n">{totalViews}</div>
          <div className="dash-stat-l">Total Gallery Views</div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-n">{data?.totalDownloads ?? '—'}</div>
          <div className="dash-stat-l">Photos Downloaded</div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-n">{galleries.length}</div>
          <div className="dash-stat-l">Active Galleries</div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-n">{recentEvents.length > 0 ? fmtTime(recentEvents[0].ts).split(',')[0] : '—'}</div>
          <div className="dash-stat-l">Last Activity</div>
        </div>
      </div>

      <div className="dash-cols">
        {/* Views by gallery */}
        <section className="dash-card">
          <h2 className="dash-card-title">Views by Gallery</h2>
          {!data && <p className="dash-empty">Loading…</p>}
          {data && !data.views && <p className="dash-empty">No data yet — views will appear after your first gallery visit.</p>}
          {data?.views && galleries.map(g => {
            const v = (data.views![g.slug] as number) ?? 0
            const d = (data.downloads?.[g.slug] as number) ?? 0
            const pct = Math.round((v / maxViews) * 100)
            return (
              <div key={g.slug} className="dash-bar-row">
                <div className="dash-bar-label">
                  <span>{g.title}</span>
                  <span className="dash-bar-nums">{v} views · {d} dl</span>
                </div>
                <div className="dash-bar-track">
                  <div className="dash-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </section>

        {/* Recent activity */}
        <section className="dash-card">
          <h2 className="dash-card-title">Recent Activity</h2>
          {recentEvents.length === 0 && <p className="dash-empty">No activity yet.</p>}
          <ul className="dash-activity">
            {recentEvents.slice(0, 20).map((ev, i) => (
              <li key={i} className="dash-activity-item">
                <span className={`dash-ev-badge dash-ev-${ev.type}`}>
                  {ev.type === 'view' ? '👁' : '↓'}
                </span>
                <div className="dash-ev-detail">
                  <span className="dash-ev-gal">{galleryName(ev.gallery)}</span>
                  <span className="dash-ev-meta">
                    {ev.type === 'download' ? `${ev.count} photo${(ev.count ?? 0) > 1 ? 's' : ''} downloaded` : 'gallery viewed'}
                    &nbsp;·&nbsp; {fmtTime(ev.ts)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Gallery quick links */}
      <section className="dash-card dash-galleries">
        <h2 className="dash-card-title">Your Galleries</h2>
        <div className="dash-gal-links">
          {galleries.map(g => (
            <Link key={g.slug} href={`/galleries/${g.slug}`} className="dash-gal-link">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.cover} alt={g.title} className="dash-gal-thumb" />
              <div>
                <div className="dash-gal-name">{g.title}</div>
                <div className="dash-gal-info">{g.photos.length} photos · {g.date}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
