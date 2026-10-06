import test from 'node:test'
import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { syncArchive, freeBody, allowedUrl } from '../scripts/archive-substack.mjs'
import { backupArchive } from '../scripts/archive-backup.mjs'
import { sanitizeArchive, searchPosts, validateIndex } from '../lib/archive-format.mjs'
import { routeAccess } from '../lib/access-policy.mjs'
import { privateStorage } from '../lib/archive-storage.mjs'
import { spawnSync } from 'node:child_process'

const body =
  '<h2>한국어 본문</h2><p>분산 시스템과 일하는 방법.</p><script>leak()</script><a href="javascript:alert(1)">링크</a>'
const post = (id, extra = {}) => ({
  id,
  slug: `post-${id}`,
  title: `글 ${id}`,
  post_date: '2026-09-01T00:00:00Z',
  audience: 'everyone',
  body_html: body,
  ...extra,
})

test('private builds refuse static export before creating an artifact', () => {
  const result = spawnSync(process.execPath, ['scripts/build.mjs'], {
    env: { ...process.env, BLOG_PROFILE: 'private', EXPORT: '1' },
    encoding: 'utf8',
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Private builds cannot be statically exported/)
})
async function temporary(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'archive-test-'))
  t.after(() => fs.rm(directory, { recursive: true, force: true }))
  return directory
}
function client(posts, overrides = {}) {
  const requests = []
  return {
    requests,
    json: async (url) => {
      requests.push(url)
      const u = new URL(url)
      if (u.pathname.endsWith('/archive'))
        return posts.slice(
          Number(u.searchParams.get('offset')),
          Number(u.searchParams.get('offset')) + 20
        )
      const found = posts.find((p) => u.pathname.endsWith('/' + p.slug))
      if (!found) throw new Error('Missing mock post')
      return found
    },
    request: async () => ({ body: Buffer.from('test-image'), type: 'image/png' }),
    ...overrides,
  }
}

test('public routes deny archive, API, feeds and unknown files; private requires configured host', () => {
  for (const route of [
    '/library',
    '/library/1',
    '/library/assets/1/image.png',
    '/lab',
    '/api/newsletter',
    '/feed.xml',
    '/search.json',
    '/secret.json',
  ])
    assert.equal(
      routeAccess('public', route, 'blog.jwjeong127.com', 'https://blog.jwjeong127.com'),
      'deny'
    )
  assert.equal(
    routeAccess('public', '/resume', 'blog.jwjeong127.com', 'https://blog.jwjeong127.com'),
    'redirect'
  )
  assert.equal(
    routeAccess('private', '/library', 'blog.jwjeong127.com', 'https://blog.dev.jwjeong127.com'),
    'deny'
  )
  assert.equal(
    routeAccess(
      'private',
      '/library',
      'blog.dev.jwjeong127.com',
      'https://blog.dev.jwjeong127.com'
    ),
    'allow'
  )
})

test('anonymous free body verification rejects paid previews, missing bodies and paywalls', () => {
  assert.equal(freeBody(post(1)), true)
  assert.equal(
    freeBody(
      post(1, { body_html: '<figure><img src="https://substackcdn.com/image/test.png"></figure>' })
    ),
    true
  )
  for (const extra of [
    { audience: 'only_paid' },
    { audience: undefined },
    { body_html: '' },
    { body_html: '<script>invisible()</script><style>body{color:red}</style>' },
    { has_paywall: true },
    { body_html: '<div class="paywall">미리보기</div>' },
    { is_published: false },
  ])
    assert.equal(freeBody(post(1, extra)), false)
})

test('archive HTML cannot execute scripts, event handlers, embeds or external image requests', () => {
  const html = sanitizeArchive(
    body +
      '<img src="https://tracker.example/a.png" onerror="leak()"><iframe src="https://example.com"></iframe><img src="/library/assets/1/' +
      'a'.repeat(64) +
      '.png" onerror="leak()">'
  )
  assert.doesNotMatch(html, /script|javascript:|onerror|iframe|tracker\.example/)
  assert.match(html, /한국어 본문/)
  assert.match(html, /\/library\/assets\/1\//)
})

test('download destinations reject arbitrary hosts, ports, HTTP and credentials', () => {
  for (const url of [
    'http://1234373801.substack.com',
    'https://127.0.0.1',
    'https://1234373801.substack.com:444',
    'https://user:pass@1234373801.substack.com',
  ])
    assert.throws(() => allowedUrl(url))
  assert.throws(() => allowedUrl('https://evil.example/image', true))
  assert.equal(
    allowedUrl('https://substackcdn.com/image/fetch/test', true).hostname,
    'substackcdn.com'
  )
})

test('archive storage rejects project paths and symlinks into the build context', async (t) => {
  const parent = await temporary(t)
  const project = path.join(parent, 'project')
  await fs.mkdir(project)
  await fs.symlink(project, path.join(parent, 'alias'))
  await fs.mkdir(path.join(parent, 'outside'))
  await fs.symlink(path.join(parent, 'outside'), path.join(project, 'public-alias'))
  for (const value of [
    project,
    path.join(project, 'public', 'archive'),
    path.join(parent, 'alias', 'new'),
    path.join(project, 'public-alias', 'new'),
  ])
    await assert.rejects(privateStorage(value, project), /outside the project/)
  assert.equal(
    await privateStorage(path.join(parent, 'private'), project),
    path.join(parent, 'private')
  )
  await assert.rejects(
    syncArchive({ root: path.resolve('public/archive'), client: client([]), delayMs: 0 }),
    /outside the project/
  )
})

test('full history pagination archives only public bodies and retries without duplicates', async (t) => {
  const root = await temporary(t)
  const posts = Array.from({ length: 23 }, (_, i) => post(i + 1))
  posts[2].audience = 'only_paid'
  const http = client(posts)
  const first = await syncArchive({ root, client: http, delayMs: 0 })
  assert.equal(first.complete, true)
  assert.equal(first.discovered, 23)
  assert.equal(first.archived, 22)
  assert.equal(first.excluded, 1)
  assert.ok(http.requests.some((u) => u.includes('offset=40')))
  assert.ok(!http.requests.some((u) => u.endsWith('/posts/post-3')))
  assert.equal((await syncArchive({ root, client: http, delayMs: 0 })).complete, true)
  const index = JSON.parse(await fs.readFile(path.join(root, 'index.json'), 'utf8'))
  assert.equal(index.posts.length, 22)
  assert.equal(searchPosts(index.posts, '한국어 시스템').length, 22)
  assert.throws(() =>
    validateIndex({ ...index, posts: [{ ...index.posts[0], revision: '../../secret' }] })
  )
})

test('blocked listing preserves last successful index and reports incomplete collection', async (t) => {
  const root = await temporary(t)
  await syncArchive({ root, client: client([post(1)]), delayMs: 0 })
  const previous = await fs.readFile(path.join(root, 'index.json'), 'utf8')
  const report = await syncArchive({
    root,
    client: client([], {
      json: async () => {
        throw new Error('HTTP 403')
      },
    }),
    delayMs: 0,
  })
  assert.equal(report.complete, false)
  assert.equal(report.listingComplete, false)
  assert.equal(await fs.readFile(path.join(root, 'index.json'), 'utf8'), previous)
})

test('repeated pagination and unknown access do not claim collection is complete', async (t) => {
  const root = await temporary(t)
  assert.equal(
    (await syncArchive({ root, client: client([], { json: async () => [post(1)] }), delayMs: 0 }))
      .listingComplete,
    false
  )
  const report = await syncArchive({
    root,
    client: client([post(1, { audience: undefined })]),
    delayMs: 0,
  })
  assert.equal(report.complete, false)
  assert.equal(report.failed, 1)
})

test('image failure is reported and a retry repairs offline images without losing old revision', async (t) => {
  const root = await temporary(t)
  const posts = [
    post(1, { body_html: body + '<img src="https://substackcdn.com/image/test.png" alt="도표">' }),
  ]
  const failed = await syncArchive({
    root,
    client: client(posts, {
      request: async () => {
        throw new Error('image unavailable')
      },
    }),
    delayMs: 0,
  })
  assert.equal(failed.complete, false)
  assert.equal(failed.assetFailures, 1)
  const repaired = await syncArchive({ root, client: client(posts), delayMs: 0 })
  assert.equal(repaired.complete, true)
  const index = JSON.parse(await fs.readFile(path.join(root, 'index.json'), 'utf8'))
  assert.equal(index.posts[0].assets.length, 1)
  assert.equal((await fs.readdir(path.join(root, 'snapshots', '1'))).length, 2)
})

test('backup and restore preserve articles and refuse existing targets, escaped symlinks and active writers', async (t) => {
  const parent = await temporary(t)
  const root = path.join(parent, 'source')
  await syncArchive({ root, client: client([post(1)]), delayMs: 0 })
  const backup = path.join(parent, 'backup')
  const restored = path.join(parent, 'restored')
  assert.equal(await backupArchive(root, backup), 1)
  assert.equal(await backupArchive(backup, restored), 1)
  assert.deepEqual(
    await fs.readFile(path.join(root, 'index.json')),
    await fs.readFile(path.join(restored, 'index.json'))
  )
  await assert.rejects(backupArchive(root, backup), { code: 'EEXIST' })
  await fs.mkdir(path.join(root, '.sync-lock'))
  await assert.rejects(syncArchive({ root, client: client([]), delayMs: 0 }), { code: 'EEXIST' })
  await fs.rmdir(path.join(root, '.sync-lock'))
  const index = JSON.parse(await fs.readFile(path.join(root, 'index.json'), 'utf8'))
  const raw = path.join(root, 'snapshots', '1', index.posts[0].revision, 'raw.html')
  await fs.rm(raw)
  await fs.symlink('/etc/hosts', raw)
  await assert.rejects(backupArchive(root, path.join(parent, 'unsafe')), /escaped storage/)
})

test('backup retains old image revisions and rejects corrupted snapshot or image bytes', async (t) => {
  const parent = await temporary(t)
  const root = path.join(parent, 'source')
  const posts = [
    post(1, { body_html: '<p>Old</p><img src="https://substackcdn.com/image/test.png">' }),
  ]
  await syncArchive({ root, client: client(posts), delayMs: 0 })
  const old = JSON.parse(await fs.readFile(path.join(root, 'index.json'), 'utf8')).posts[0]
  posts[0].body_html = '<p>New</p>'
  await syncArchive({ root, client: client(posts), delayMs: 0 })
  const backup = path.join(parent, 'backup')
  await backupArchive(root, backup)
  assert.deepEqual(
    await fs.readFile(path.join(backup, 'assets', '1', old.assets[0])),
    Buffer.from('test-image')
  )
  assert.equal((await fs.readdir(path.join(backup, 'snapshots', '1'))).length, 2)
  const image = path.join(root, 'assets', '1', old.assets[0])
  await fs.writeFile(image, 'damaged')
  await assert.rejects(backupArchive(root, path.join(parent, 'bad-image')), /image checksum/)
  await fs.writeFile(image, 'test-image')
  await fs.writeFile(path.join(root, 'snapshots', '1', old.revision, 'raw.html'), 'damaged')
  await assert.rejects(backupArchive(root, path.join(parent, 'bad-snapshot')), /revision checksum/)
  await assert.rejects(fs.stat(path.join(parent, 'bad-image')), { code: 'ENOENT' })
  await assert.rejects(fs.stat(path.join(parent, 'bad-snapshot')), { code: 'ENOENT' })
})
