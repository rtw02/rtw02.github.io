import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { findGallery } from '@/lib/galleries-store'
import { getGalleryPin } from '@/lib/gallery-pins'
import { getLiveFilenames, filterLive } from '@/lib/blob-photos'
import type { Photo } from '@/data/galleries'
import GalleryClient from '../GalleryClient'

export const dynamic = 'force-dynamic'

// Route param is the filename WITHOUT its extension (e.g. DSC08007), for clean URLs.
const base = (filename: string) => filename.replace(/\.[^.]+$/, '')

async function resolve(slug: string, photoParam: string) {
  const gallery = await findGallery(slug)
  if (!gallery) return null
  const live = await getLiveFilenames(slug)
  const livePhotos = filterLive(gallery.photos, live)
  const key = decodeURIComponent(photoParam)
  const photo = livePhotos.find((p: Photo) => base(p.filename) === key)
  if (!photo) return null
  return { gallery: { ...gallery, photos: livePhotos }, photo }
}

export async function generateMetadata(
  { params }: { params: { slug: string; photo: string } }
): Promise<Metadata> {
  const res = await resolve(params.slug, params.photo)
  if (!res) return { title: 'Photo — Ryan Wong' }
  const { gallery, photo } = res
  const title = `${gallery.title} — Ryan Wong`
  const description = photo.alt || `${gallery.title} · ${gallery.subtitle}`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [{ url: photo.src, width: photo.w, height: photo.h, alt: photo.alt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [photo.src],
    },
  }
}

export default async function PhotoPage(
  { params }: { params: { slug: string; photo: string } }
) {
  const { slug } = params
  const gallery = await findGallery(slug)
  if (!gallery) notFound()

  // Same PIN gate as the gallery page — a shared photo link into a gated
  // gallery still requires the unlock.
  const requiredPin = await getGalleryPin(slug)
  const cookieStore = await cookies()
  if (requiredPin) {
    const galCookie = cookieStore.get(`rw-gallery-${slug}`)
    if (galCookie?.value !== requiredPin) {
      redirect(`/galleries/${slug}/unlock`)
    }
  }

  const session = cookieStore.get('rw-session')
  const isAdmin = session?.value === process.env.DASHBOARD_SECRET

  const live = await getLiveFilenames(slug)
  const livePhotos = filterLive(gallery.photos, live)
  const key = decodeURIComponent(params.photo)
  if (!livePhotos.some((p: Photo) => base(p.filename) === key)) notFound()

  return (
    <GalleryClient
      gallery={{ ...gallery, photos: livePhotos }}
      isAdmin={isAdmin}
      initialPhoto={key}
    />
  )
}
