// An absent profile always produces the public site. Next.js embeds this at build time.
const isPrivate = process.env.BLOG_PROFILE === 'private'
const siteUrl =
  process.env.SITE_URL ||
  (isPrivate ? 'https://blog.dev.jwjeong127.com' : 'https://blog.jwjeong127.com')

module.exports = { isPrivate, siteUrl }
