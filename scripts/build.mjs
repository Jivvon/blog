import { rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

if (process.env.BLOG_PROFILE && !['public', 'private'].includes(process.env.BLOG_PROFILE))
  throw new Error('Invalid BLOG_PROFILE')
// Contentlayer does not include arbitrary environment variables in its cache key.
// Never reuse a private generated-content cache in a public build.
for (const generated of [
  '.next',
  '.contentlayer',
  'public/feed.xml',
  'public/search.json',
  'public/tags',
])
  rmSync(generated, { recursive: true, force: true })
const build = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
  stdio: 'inherit',
  env: process.env,
})
if (build.status !== 0) process.exit(build.status || 1)
const postbuild = spawnSync(process.execPath, ['scripts/postbuild.mjs'], {
  stdio: 'inherit',
  env: process.env,
})
process.exit(postbuild.status || 0)
