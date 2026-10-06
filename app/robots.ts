import { MetadataRoute } from 'next'
import siteMetadata from '@/data/siteMetadata'
import { isPrivate } from '../lib/profile'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  if (isPrivate) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/blog/', '/tags/', '/feed.xml', '/search.json'],
    },
    sitemap: `${siteMetadata.siteUrl}/sitemap.xml`,
    host: siteMetadata.siteUrl,
  }
}
