import sanitizeHtml from 'sanitize-html'

export const assetNamePattern = /^[a-f0-9]{64}\.(png|jpeg|webp|gif|avif)$/
export const idPattern = /^[1-9][0-9]*$/
export const hashPattern = /^[a-f0-9]{64}$/

// Neither imported HTML nor Markdown is executed as MDX/JavaScript.
export function sanitizeArchive(html) {
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'ul',
      'ol',
      'li',
      'strong',
      'em',
      'b',
      'i',
      's',
      'del',
      'hr',
      'pre',
      'code',
      'a',
      'img',
      'figure',
      'figcaption',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'div',
      'span',
      'sup',
      'sub',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'loading'],
      ol: ['start'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['https', 'http'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { href: attribs.href || '', target: '_blank', rel: 'noopener noreferrer' },
      }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: { src: attribs.src || '', alt: attribs.alt || '', loading: 'lazy' },
      }),
    },
    exclusiveFilter: (frame) =>
      frame.tag === 'img' &&
      !/^\/library\/assets\/[1-9][0-9]*\/[a-f0-9]{64}\.(png|jpeg|webp|gif|avif)$/.test(
        frame.attribs.src || ''
      ),
  })
}

export function validateIndex(index) {
  if (index?.schemaVersion !== 1 || !Array.isArray(index.posts) || index.posts.length > 50000)
    throw new Error('Invalid archive index')
  const ids = new Set()
  for (const post of index.posts) {
    if (
      !idPattern.test(post.id) ||
      ids.has(post.id) ||
      !hashPattern.test(post.revision) ||
      typeof post.title !== 'string' ||
      typeof post.text !== 'string' ||
      !Array.isArray(post.assets) ||
      post.assets.some((name) => !assetNamePattern.test(name))
    )
      throw new Error('Invalid archive post')
    if (!Number.isFinite(Date.parse(post.publishedAt))) throw new Error('Invalid archive date')
    const source = new URL(post.sourceUrl)
    if (
      source.protocol !== 'https:' ||
      source.hostname !== '1234373801.substack.com' ||
      !source.pathname.startsWith('/p/')
    )
      throw new Error('Invalid archive source')
    ids.add(post.id)
  }
  return index
}

export function searchPosts(posts, query = '', order = 'newest') {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  return posts
    .filter((post) =>
      words.every((word) => `${post.title}\n${post.text}`.toLocaleLowerCase().includes(word))
    )
    .sort(
      (a, b) =>
        (order === 'oldest' ? 1 : -1) * (Date.parse(a.publishedAt) - Date.parse(b.publishedAt))
    )
}
