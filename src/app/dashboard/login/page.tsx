'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError('Incorrect password.')
      setLoading(false)
    }
  }

  return (
    <main className="dash-login">
      <div className="dash-login-box">
        <div className="dash-login-logo">R.W</div>
        <h1 className="dash-login-title">Dashboard</h1>
        <p className="dash-login-sub">Private access only.</p>
        <form onSubmit={submit} className="dash-login-form">
          <input
            type="password"
            className="dash-input"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="dash-login-err">{error}</p>}
          <button className="gal-btn gal-btn-solid dash-login-btn" type="submit" disabled={loading}>
            {loading ? '…' : 'Enter'}
          </button>
        </form>
      </div>
    </main>
  )
}
