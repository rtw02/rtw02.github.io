import { timingSafeEqual } from 'crypto'

// Constant-time string comparison for secrets (passwords, PINs). Avoids leaking
// how many leading characters matched via response timing. The length check can
// still reveal length, which is acceptable for these low-value-length secrets.
// Node runtime only (uses node:crypto) — do not use in edge middleware.
export function safeEqual(a?: string | null, b?: string | null): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}
