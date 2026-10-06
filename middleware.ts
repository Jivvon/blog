import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { routeAccess } from './lib/access-policy.mjs'
import { isPrivate, siteUrl } from './lib/profile'

export function middleware(request: NextRequest) {
  // nextUrl.hostname can be the internal Next.js listener rather than the HTTP Host.
  // Do not trust client-supplied X-Forwarded-Host for this check.
  const host = request.headers.get('host') || ''
  const hostname = /^[a-z0-9.-]+(?::[0-9]+)?$/i.test(host) ? new URL(`http://${host}`).hostname : ''
  const access = routeAccess(
    isPrivate ? 'private' : 'public',
    request.nextUrl.pathname,
    hostname,
    siteUrl
  )
  if (access === 'redirect') return NextResponse.redirect(new URL('/about', siteUrl))
  if (access === 'deny') return new NextResponse('Not found', { status: 404 })
  const response = NextResponse.next()
  if (isPrivate) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    response.headers.set('Cache-Control', 'private, no-store')
  }
  return response
}

export const config = {
  matcher: '/:path*',
}
