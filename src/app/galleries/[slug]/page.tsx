import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { galleries } from '@/data/galleries'
import { getGalleryPin } from '@/lib/gallery-pins'
import GalleryClient from './GalleryClient'

export default async function GalleryPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const gallery = galleries.find(g => g.slug === slug)
  if (!gallery) notFound()

  const requiredPin = await getGalleryPin(slug)

  if (requiredPin) {
    const cookieStore = await cookies()
    const galCookie = cookieStore.get(`rw-gallery-${slug}`)
    if (galCookie?.value !== requiredPin) {
      redirect(`/galleries/${slug}/unlock`)
    }
  }

  return <GalleryClient gallery={gallery} />
}
