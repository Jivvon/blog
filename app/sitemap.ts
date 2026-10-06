import { MetadataRoute } from 'next'
import siteMetadata from '@/data/siteMetadata'
import { isPrivate } from '../lib/profile'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  if (isPrivate) return []
  const siteUrl = siteMetadata.siteUrl

  return ['', 'about'].map((route) => ({
    url: `${siteUrl}/${route}`,
    lastModified: new Date().toISOString().split('T')[0],
  }))
}
