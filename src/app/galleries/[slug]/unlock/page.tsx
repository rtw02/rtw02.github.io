'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UnlockPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const slug = params.slug
  const [pin, setPin] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  useEffect(() => {
    inputs[0].current?.focus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...pin]
    next[i] = digit
    setPin(next)
    setError('')
    if (digit && i < 3) inputs[i + 1].current?.focus()
    if (next.every(d => d !== '') && next.join('').length === 4) {
      submit(next.join(''))
    }
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[i] && i > 0) {
      inputs[i - 1].current?.focus()
    }
  }

  const submit = async (code: string) => {
    if (!slug) return
    setLoading(true)
    try {
      const res = await fetch('/api/galleries/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, pin: code }),
      })
      if (res.ok) {
        router.push(`/galleries/${slug}`)
        router.refresh()
      } else {
        setError('Incorrect PIN')
        setPin(['', '', '', ''])
        setLoading(false)
        setTimeout(() => inputs[0].current?.focus(), 50)
      }
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <main className="unlock-page">
      <div className="unlock-card">
        <p className="unlock-eyebrow">Private Gallery</p>
        <h1 className="unlock-title">Enter PIN</h1>
        <p className="unlock-sub">This gallery is password protected.<br />Enter the 4-digit PIN to view.</p>

        <div className="unlock-pins">
          {pin.map((d, i) => (
            <input
              key={i}
              ref={inputs[i]}
              className={`unlock-pin-input${error ? ' unlock-pin-input--err' : ''}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onFocus={e => e.target.select()}
              disabled={loading}
              aria-label={`PIN digit ${i + 1}`}
            />
          ))}
        </div>

        {error && <p className="unlock-err">{error}</p>}

        <p className="unlock-hint">
          Contact <a href="mailto:rtwong02@gmail.com">rtwong02@gmail.com</a> for access
        </p>
      </div>
    </main>
  )
}
