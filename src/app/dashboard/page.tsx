'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { galleries } from '@/data/galleries'

type PinState = { enabled: boolean; value: string }
type PinsMap = Record<string, PinState>

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
  const [pins, setPins] = useState<PinsMap>({})
  const [pinSaving, setPinSaving] = useState<Record<string, boolean>>({})
  const [pinMsg, setPinMsg] = useState<Record<string, string>>({})
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(setData)
      .catch(() => setErr('Failed to load analytics.'))

    fetch('/api/galleries/counts')
      .then(r => r.json())
      .then(setCounts)
      .catch(() => {})

    fetch('/api/galleries/pin')
      .then(r => r.json())
      .then((stored: Record<string, string>) => {
        const map: PinsMap = {}
        galleries.forEach(g => {
          map[g.slug] = stored[g.slug]
            ? { enabled: true, value: stored[g.slug] }
            : { enabled: false, value: '' }
        })
        setPins(map)
      })
      .catch(() => {})
  }, [])

  const savePin = async (slug: string) => {
    const p = pins[slug]
    if (!p) return
    setPinSaving(s => ({ ...s, [slug]: true }))
    try {
      const res = await fetch('/api/galleries/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, pin: p.enabled ? p.value : null }),
      })
      const json = await res.json()
      setPinMsg(m => ({ ...m, [slug]: json.ok ? 'Saved' : (json.error || 'Error') }))
    } catch {
      setPinMsg(m => ({ ...m, [slug]: 'Error' }))
    } finally {
      setPinSaving(s => ({ ...s, [slug]: false }))
      setTimeout(() => setPinMsg(m => ({ ...m, [slug]: '' })), 2000)
    }
  }

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
        <div className="dash-hd-right">
          <div className="dash-hd-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <Link href="/dashboard/import" className="gal-btn gal-btn-solid" style={{ fontSize: '.7rem' }}>+ New Gallery</Link>
        </div>
      </div>

      {err && (
        <div className="dash-err-card">
          <p className="dash-err">{err}</p>
          <p className="dash-err-hint">Analytics require Vercel KV. Connect Upstash Redis in the <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">Vercel Marketplace</a> and add <code>KV_REST_API_URL</code> + <code>KV_REST_API_TOKEN</code> env vars.</p>
        </div>
      )}

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

      {/* Vercel setup */}
      <section className="dash-card dash-setup">
        <h2 className="dash-card-title">Vercel Setup</h2>
        <p className="dash-setup-intro">Required env vars — set in Vercel project settings → Environment Variables:</p>
        <div className="dash-env-grid">
          {[
            { key: 'DASHBOARD_PASSWORD', desc: 'Password to log into this dashboard', example: 'mysecretpassword' },
            { key: 'DASHBOARD_SECRET',   desc: 'Random secret for session cookies',   example: 'rand-hex-32-chars' },
            { key: 'KV_REST_API_URL',    desc: 'Upstash Redis URL (Vercel Marketplace → Storage → Upstash)', example: 'https://…upstash.io' },
            { key: 'KV_REST_API_TOKEN',  desc: 'Upstash Redis token', example: 'AX…' },
          ].map(({ key, desc, example }) => (
            <div key={key} className="dash-env-row">
              <code className="dash-env-key">{key}</code>
              <span className="dash-env-desc">{desc}</span>
              <span className="dash-env-ex">e.g. <em>{example}</em></span>
            </div>
          ))}
          {galleries.map(g => (
            <div key={g.slug} className="dash-env-row dash-env-optional">
              <code className="dash-env-key">GALLERY_PIN_{g.slug.toUpperCase().replace(/-/g,'_')}</code>
              <span className="dash-env-desc">Static PIN for {g.title} (fallback if KV not connected)</span>
              <span className="dash-env-ex">e.g. <em>1234</em></span>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery management */}
      <section className="dash-card dash-galleries">
        <h2 className="dash-card-title">Your Galleries</h2>
        <div className="dash-gal-links">
          {galleries.map(g => {
            const p = pins[g.slug]
            const saving = pinSaving[g.slug]
            const msg = pinMsg[g.slug]
            return (
              <div key={g.slug} className="dash-gal-row">
                <Link href={`/galleries/${g.slug}`} className="dash-gal-link">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.cover} alt={g.title} className="dash-gal-thumb" />
                  <div>
                    <div className="dash-gal-name">{g.title}</div>
                    <div className="dash-gal-info">{counts[g.slug] ?? g.photos.length} photos · {g.date}</div>
                  </div>
                </Link>
                <div className="dash-pin-ctrl">
                  <label className="dash-pin-toggle" title={p?.enabled ? 'PIN enabled' : 'No PIN'}>
                    <input
                      type="checkbox"
                      checked={p?.enabled ?? false}
                      onChange={e => setPins(prev => ({
                        ...prev,
                        [g.slug]: { ...prev[g.slug], enabled: e.target.checked }
                      }))}
                    />
                    <span className="dash-pin-slider" />
                    <span className="dash-pin-lbl">{p?.enabled ? 'PIN on' : 'Public'}</span>
                  </label>
                  {p?.enabled && (
                    <input
                      className="dash-input dash-pin-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      placeholder="1234"
                      value={p.value}
                      onChange={e => setPins(prev => ({
                        ...prev,
                        [g.slug]: { ...prev[g.slug], value: e.target.value.replace(/\D/g, '') }
                      }))}
                    />
                  )}
                  <button
                    className="gal-btn gal-btn-ghost dash-pin-save"
                    onClick={() => savePin(g.slug)}
                    disabled={saving}
                  >
                    {saving ? '…' : msg || 'Save'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
