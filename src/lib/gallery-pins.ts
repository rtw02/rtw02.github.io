export async function getGalleryPin(slug: string): Promise<string | null> {
  try {
    const { kv } = await import('@vercel/kv')
    const stored = await kv.hget<string>('gallery-pins', slug)
    if (stored !== undefined && stored !== null) {
      return stored || null // empty string = disabled
    }
  } catch {}
  // fallback to env var
  const key = `GALLERY_PIN_${slug.toUpperCase().replace(/-/g, '_')}`
  return process.env[key] || null
}

export async function setGalleryPin(slug: string, pin: string | null): Promise<void> {
  const { kv } = await import('@vercel/kv')
  if (pin) {
    await kv.hset('gallery-pins', { [slug]: pin })
  } else {
    await kv.hdel('gallery-pins', slug)
  }
}

export async function getAllGalleryPins(): Promise<Record<string, string>> {
  try {
    const { kv } = await import('@vercel/kv')
    const pins = await kv.hgetall<Record<string, string>>('gallery-pins')
    return pins || {}
  } catch {
    return {}
  }
}
