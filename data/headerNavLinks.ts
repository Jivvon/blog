import { isPrivate } from '../lib/profile'

const headerNavLinks: { href: string; title: string }[] = isPrivate
  ? [
      { href: '/library', title: '서재' },
      { href: '/blog', title: '블로그' },
      { href: '/lab', title: '개발 공간' },
      { href: '/about', title: '소개' },
    ]
  : []

export default headerNavLinks
