import type { Metadata } from 'next'
import ExperienceClient from './ExperienceClient'
import './experience.css'

export const metadata: Metadata = {
  title: 'Experience — Ryan Wong',
  description: 'A scroll-driven, cinematic WebGL journey through selected frames.',
}

export default function ExperiencePage() {
  return <ExperienceClient />
}
