export type Photo = {
  src: string
  alt: string
  filename: string
}

export type Gallery = {
  slug: string
  title: string
  subtitle: string
  date: string
  cover: string
  photos: Photo[]
}

export const galleries: Gallery[] = [
  {
    slug: 'graduation-2023',
    title: 'Graduation 2023',
    subtitle: 'Cornell University',
    date: 'May 2023',
    cover: '/images/portrait-window.jpg',
    photos: [
      { src: '/images/portrait-window.jpg',  alt: 'Portrait in Gothic window niche, backlit',              filename: 'portrait-window.jpg' },
      { src: '/images/group-arch.jpg',        alt: 'Group portrait under Cornell arch',                    filename: 'group-arch.jpg' },
      { src: '/images/golden-hour.jpg',       alt: 'Couple portrait at golden hour',                      filename: 'golden-hour.jpg' },
      { src: '/images/celebration.jpg',       alt: 'Graduation celebration at McGraw Tower',              filename: 'celebration.jpg' },
      { src: '/images/gothic-arch.jpg',       alt: 'Portrait framed in Gothic arch at Cornell',           filename: 'gothic-arch.jpg' },
      { src: '/images/champagne-toast.jpg',   alt: 'Group champagne toast under Gothic arch',             filename: 'champagne-toast.jpg' },
      { src: '/images/mcgraw-tower.jpg',      alt: 'Portrait at McGraw Tower during golden hour',         filename: 'mcgraw-tower.jpg' },
      { src: '/images/arch-corridor.jpg',     alt: 'Portrait under Gothic arch corridor at Cornell',      filename: 'arch-corridor.jpg' },
      { src: '/images/golden-stole.jpg',      alt: 'Graduate in golden stole at sunset',                  filename: 'golden-stole.jpg' },
      { src: '/images/mcgraw-duo.jpg',        alt: 'Two graduates at McGraw Tower with spring foliage',   filename: 'mcgraw-duo.jpg' },
      { src: '/images/duo-stone.jpg',         alt: 'Two graduates on stone ledge at golden hour',         filename: 'duo-stone.jpg' },
      { src: '/images/sunset-portrait.jpg',   alt: 'Graduate portrait at sunset against Cornell stone',   filename: 'sunset-portrait.jpg' },
    ],
  },
  {
    slug: 'jazz-night-929',
    title: 'Jazz Night — 929',
    subtitle: 'New York City',
    date: 'September 2026',
    cover: '/images/jazz-vocalist.jpg',
    photos: [
      { src: '/images/jazz-vocalist.jpg', alt: 'Jazz vocalist performing at 929 NYC',    filename: 'jazz-vocalist.jpg' },
      { src: '/images/jazz-bar.jpg',      alt: 'Jazz bar ambiance, candlelit table',     filename: 'jazz-bar.jpg' },
    ],
  },
  {
    slug: 'blue-hour',
    title: 'Blue Hour',
    subtitle: 'New York City',
    date: 'September 2026',
    cover: '/images/blue-hour.jpg',
    photos: [
      { src: '/images/blue-hour.jpg', alt: 'Group portrait against blue backdrop', filename: 'blue-hour.jpg' },
    ],
  },
  {
    slug: 'harvest-2026',
    title: 'Harvest',
    subtitle: 'Fishkill Farms',
    date: 'October 2026',
    cover: '/images/apple-juggle.jpg',
    photos: [
      { src: '/images/apple-juggle.jpg', alt: 'Portrait in apple orchard, Fishkill Farms', filename: 'apple-juggle.jpg' },
    ],
  },
]
