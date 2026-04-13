const headerNavLinks = [
  { href: '/', title: 'Home' },
  { href: '/blog', title: 'Blog' },
  { href: '/tags', title: 'Tags' },
  // { href: '/projects', title: 'Projects' },
  { href: '/about', title: 'About' },
  ...(process.env.NODE_ENV === 'development'
    ? [
        { href: '/resume', title: 'Resume' },
        { href: '/career', title: 'Career' },
      ]
    : []),
  // { href: '/portfolio', title: 'Portfolio' },
]

export default headerNavLinks
