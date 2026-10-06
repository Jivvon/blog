import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import http from 'node:http'
import { syncArchive } from './archive-substack.mjs'

const profile = process.env.BLOG_PROFILE === 'private' ? 'private' : 'public'
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-web-test-'))
const image = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j/mkAAAAASUVORK5CYII=',
  'base64'
)
const fixture = {
  id: 9901,
  slug: 'verification-fixture',
  title: '검증용 샘플 — 실제 수집 글 아님',
  publishedBy: [{ name: '테스트 데이터' }],
  post_date: '2026-09-01T00:00:00Z',
  audience: 'everyone',
  body_html:
    '<p>PRIVATE_ARCHIVE_SENTINEL 한국어 검색 검증</p><script>evil()</script><img src="https://substackcdn.com/image/test.png" alt="검증용 이미지">',
}
await syncArchive({
  root,
  delayMs: 0,
  client: {
    request: async () => ({ body: image, type: 'image/png' }),
    json: async (url) =>
      url.includes('/archive?')
        ? new URL(url).searchParams.get('offset') === '0'
          ? [fixture]
          : []
        : fixture,
  },
})
const index = JSON.parse(await fs.readFile(path.join(root, 'index.json'), 'utf8'))
const assetRoute = `/library/assets/substack-1234373801-9901/${index.posts[0].assets[0]}`
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3109'], {
  env: { ...process.env, ARCHIVE_DIR: root },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let log = ''
server.stdout.on('data', (data) => {
  log += data
})
server.stderr.on('data', (data) => {
  log += data
})
const hostname = profile === 'private' ? 'blog.dev.jwjeong127.com' : 'blog.jwjeong127.com'
// Node 24 fetch follows the browser rule that forbids overriding Host.
const request = (route, options = {}) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      new URL(`http://127.0.0.1:3109${route}`),
      {
        ...options,
        headers: { Host: hostname, ...options.headers },
      },
      (response) => {
        const parts = []
        response.on('data', (part) => parts.push(part))
        response.on('end', () =>
          resolve({
            status: response.statusCode,
            headers: new Headers(
              Object.entries(response.headers)
                .filter(([, value]) => value !== undefined)
                .map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : value])
            ),
            text: async () => Buffer.concat(parts).toString('utf8'),
            body: Buffer.concat(parts),
          })
        )
        response.on('error', reject)
      }
    )
    req.on('error', reject)
    req.end()
  })
try {
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await request('/about')
      ready = true
      break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
  assert.ok(ready, log)
  const about = await request('/about')
  assert.equal(about.status, 200)
  if (profile === 'public') {
    for (const route of [
      '/library',
      '/library/substack-1234373801-9901',
      '/lab',
      '/api/newsletter',
      '/search.json',
      '/feed.xml',
      assetRoute,
    ]) {
      const response = await request(route)
      assert.equal(response.status, 404, route)
      assert.doesNotMatch(await response.text(), /PRIVATE_ARCHIVE_SENTINEL/)
    }
    for (const route of ['/', '/blog', '/tags', '/resume', '/projects'])
      assert.equal((await request(route)).status, 307, route)
    const generated = await import('../.contentlayer/generated/index.mjs')
    assert.equal(generated.allBlogs.length, 0)
    assert.equal(generated.allResumes.length, 0)
    assert.doesNotMatch(await about.text(), /PRIVATE_ARCHIVE_SENTINEL/)
  } else {
    const library = await request('/library?q=한국어')
    assert.equal(library.status, 200)
    assert.match(library.headers.get('x-robots-tag'), /noindex/)
    assert.match(library.headers.get('cache-control'), /private/)
    assert.match(await library.text(), /검증용 샘플/)
    const article = await request('/library/substack-1234373801-9901')
    assert.equal(article.status, 200)
    const html = await article.text()
    assert.match(html, /PRIVATE_ARCHIVE_SENTINEL/)
    assert.doesNotMatch(html, /evil\(\)/)
    const asset = await request(assetRoute)
    assert.equal(asset.status, 200)
    assert.equal(asset.headers.get('content-type'), 'image/png')
    assert.deepEqual(asset.body, image)
    assert.equal(
      (await request('/library/assets/substack-1234373801-9901/' + 'a'.repeat(64) + '.png')).status,
      404
    )
    assert.equal((await request('/library/9999')).status, 404)
    assert.equal(
      (await request('/library', { headers: { Host: 'blog.jwjeong127.com' } })).status,
      404
    )
    assert.equal((await request('/lab')).status, 200)
    assert.equal((await request('/blog')).status, 200)
    assert.equal((await request('/api/newsletter', { method: 'POST' })).status, 404)
    assert.match(await (await request('/robots.txt')).text(), /Disallow: \//)
  }
  console.log(`${profile}: HTTP, host, route, data and rendering checks passed`)
} finally {
  server.kill('SIGTERM')
  await new Promise((resolve) => server.once('exit', resolve))
  await fs.rm(root, { recursive: true, force: true })
}
