export function routeAccess(profile, pathname, hostname, siteUrl) {
  if (profile === 'private') {
    if (pathname === '/api' || pathname.startsWith('/api/')) return 'deny'
    return hostname === new URL(siteUrl).hostname ? 'allow' : 'deny'
  }
  if (pathname === '/') return 'redirect'
  if (/^\/(blog|tags|resume|projects)(\/|$)/.test(pathname)) return 'redirect'
  if (pathname === '/about' || pathname === '/robots.txt' || pathname === '/sitemap.xml')
    return 'allow'
  if (/^\/_next\/(static\/|image$)/.test(pathname)) return 'allow'
  if (/^\/static\/(images|favicons)\//.test(pathname) || pathname === '/favicon.ico') return 'allow'
  return 'deny'
}
