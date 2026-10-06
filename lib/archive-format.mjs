import sanitizeHtml from 'sanitize-html'

export const assetNamePattern = /^[a-f0-9]{64}\.(png|jpeg|webp|gif|avif)$/
export const idPattern = /^[a-z0-9][a-z0-9_-]{0,127}$/
export const hashPattern = /^[a-f0-9]{64}$/
export const substackSource = {
  id: 'substack-1234373801',
  kind: 'substack',
  name: '실리콘밸리 생존자',
  baseUrl: 'https://1234373801.substack.com',
}

export function emptyIndex() {
  return { schemaVersion: 2, sources: [], capturedAt: null, posts: [] }
}

function validSourceUrl(value) {
  const url = new URL(value)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
    throw new Error('Invalid archive source URL')
  return url
}

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
      !/^\/library\/assets\/[a-z0-9][a-z0-9_-]{0,127}\/[a-f0-9]{64}\.(png|jpeg|webp|gif|avif)$/.test(
        frame.attribs.src || ''
      ),
  })
}

export function validateIndex(index) {
  // Keep legacy identifiers and paths readable; subsequent writes upgrade the index only.
  if (index?.schemaVersion === 1 && Array.isArray(index.posts)) {
    index = {
      schemaVersion: 2,
      sources: [substackSource],
      capturedAt: index.capturedAt,
      posts: index.posts.map((post) => ({ ...post, sourceId: substackSource.id })),
    }
  }
  if (
    index?.schemaVersion !== 2 ||
    !Array.isArray(index.sources) ||
    index.sources.length > 10000 ||
    !Array.isArray(index.posts) ||
    index.posts.length > 50000
  )
    throw new Error('Invalid archive index')
  const sources = new Map()
  for (const source of index.sources) {
    if (
      typeof source.id !== 'string' ||
      !idPattern.test(source.id) ||
      sources.has(source.id) ||
      typeof source.name !== 'string' ||
      !source.name.trim() ||
      typeof source.kind !== 'string' ||
      !source.kind.trim()
    )
      throw new Error('Invalid archive source')
    validSourceUrl(source.baseUrl)
    sources.set(source.id, source)
  }
  const ids = new Set()
  for (const post of index.posts) {
    if (
      typeof post.id !== 'string' ||
      !idPattern.test(post.id) ||
      ids.has(post.id) ||
      !sources.has(post.sourceId) ||
      !hashPattern.test(post.revision) ||
      typeof post.title !== 'string' ||
      typeof post.text !== 'string' ||
      !Array.isArray(post.assets) ||
      post.assets.some((name) => !assetNamePattern.test(name))
    )
      throw new Error('Invalid archive post')
    if (!Number.isFinite(Date.parse(post.publishedAt))) throw new Error('Invalid archive date')
    validSourceUrl(post.sourceUrl)
    ids.add(post.id)
  }
  return index
}

export function searchPosts(posts, query = '', order = 'newest', sourceId = '') {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  return posts
    .filter(
      (post) =>
        (!sourceId || post.sourceId === sourceId) &&
        words.every((word) => `${post.title}\n${post.text}`.toLocaleLowerCase().includes(word))
    )
    .sort(
      (a, b) =>
        (order === 'oldest' ? 1 : -1) * (Date.parse(a.publishedAt) - Date.parse(b.publishedAt))
    )
}
