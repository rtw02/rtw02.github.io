import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { galleries } from '@/data/galleries'
import { getGalleryPin } from '@/lib/gallery-pins'
import { getLiveFilenames, filterLive } from '@/lib/blob-photos'
import GalleryClient from './GalleryClient'

export const dynamic = 'force-dynamic'

export default async function GalleryPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const gallery = galleries.find(g => g.slug === slug)
  if (!gallery) notFound()

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

  return <GalleryClient gallery={{ ...gallery, photos: livePhotos }} isAdmin={isAdmin} />
}
