import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync } from 'node:crypto'
import { DefaultRequestSigner, SimpleAuthenticationDetailsProvider } from 'oci-common'
import { ociStore } from '../lib/archive-store.mjs'
import {
  emptyIndex,
  substackSource,
  validateIndex,
  searchPosts,
  sanitizeArchive,
} from '../lib/archive-format.mjs'
import { syncArchive } from '../scripts/archive-substack.mjs'

function bucket(t) {
  const objects = new Map()
  let revision = 0
  let failSnapshot = false
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const provider = new SimpleAuthenticationDetailsProvider(
    'test-tenancy',
    'test-user',
    'test-fingerprint',
    privateKey.export({ type: 'pkcs8', format: 'pem' }),
    null
  )
  const signed = []
  const store = ociStore({
    namespace: 'test',
    bucket: 'blog-archive',
    region: 'ap-seoul-1',
    signer: new DefaultRequestSigner(provider),
    transport: async (uri, request) => {
      const key = decodeURIComponent(new URL(uri).pathname.split('/o/')[1])
      signed.push({ key, request })
      assert.match(request.headers.get('authorization'), /^Signature version="1"/)
      const current = objects.get(key)
      if (request.method === 'GET')
        return current
          ? new Response(current.body, { headers: { etag: current.etag } })
          : new Response(null, { status: 404 })
      if (failSnapshot && key.startsWith('snapshots/')) return new Response(null, { status: 503 })
      if (
        (request.headers.get('if-none-match') === '*' && current) ||
        (request.headers.has('if-match') && request.headers.get('if-match') !== current?.etag)
      )
        return new Response(null, { status: 412 })
      assert.equal(
        request.headers.get('opc-content-sha256'),
        createHash('sha256').update(request.body).digest('base64')
      )
      objects.set(key, { body: Buffer.from(request.body), etag: `etag-${++revision}` })
      return new Response(null, { status: 200 })
    },
  })
  t.after(() => store.close())
  return {
    store,
    objects,
    signed,
    breakUploads: () => {
      failSnapshot = true
    },
  }
}
const upstreamPost = {
  id: 1,
  slug: 'hello',
  title: 'Substack 글',
  audience: 'everyone',
  post_date: '2026-09-01T00:00:00Z',
  body_html: '<p>한국어 본문</p><img src="https://substackcdn.com/image.png">',
}
const image = Buffer.from([0, 255, 128, 129, 42])
const client = {
  json: async (url) =>
    url.includes('/archive?')
      ? new URL(url).searchParams.get('offset') === '0'
        ? [upstreamPost]
        : []
      : upstreamPost,
  request: async () => ({ body: image, type: 'image/png' }),
}

test('source-independent index migrates legacy paths and filters separate sources', () => {
  const legacy = {
    schemaVersion: 1,
    capturedAt: null,
    posts: [
      {
        id: '1',
        revision: 'a'.repeat(64),
        title: 'old',
        text: 'old',
        publishedAt: upstreamPost.post_date,
        sourceUrl: `${substackSource.baseUrl}/p/old`,
        assets: [],
      },
    ],
  }
  const upgraded = validateIndex(legacy)
  assert.equal(upgraded.schemaVersion, 2)
  assert.equal(upgraded.posts[0].id, '1')
  assert.equal(upgraded.posts[0].sourceId, substackSource.id)
  assert.match(
    sanitizeArchive(`<img src="/library/assets/rss-example-1/${'a'.repeat(64)}.png">`),
    /rss-example-1/
  )
  assert.throws(() =>
    validateIndex({ ...upgraded, posts: [{ ...upgraded.posts[0], sourceId: 'missing' }] })
  )
  assert.throws(() =>
    validateIndex({
      ...upgraded,
      posts: [{ ...upgraded.posts[0], sourceUrl: 'javascript:alert(1)' }],
    })
  )
})

test('OCI collection retains other sources, signs requests and stores binary images without PVC', async (t) => {
  const { store, objects, signed } = bucket(t)
  const existing = {
    ...emptyIndex(),
    sources: [
      { id: 'rss-example', kind: 'rss', name: '다른 출처', baseUrl: 'https://example.com' },
    ],
    posts: [
      {
        id: 'rss-example-1',
        sourceId: 'rss-example',
        revision: 'a'.repeat(64),
        title: '다른 글',
        text: '한국어',
        assets: [],
        sourceUrl: 'https://example.com/article/1',
        publishedAt: upstreamPost.post_date,
      },
    ],
  }
  await store.put('index.json', JSON.stringify(existing), { ifNoneMatch: '*' })
  const report = await syncArchive({ store, client, delayMs: 0 })
  assert.equal(report.complete, true)
  const index = validateIndex(JSON.parse((await store.get('index.json')).body))
  assert.equal(index.posts.length, 2)
  assert.equal(index.sources.length, 2)
  assert.equal(searchPosts(index.posts, '한국어', 'newest', 'rss-example').length, 1)
  const post = index.posts.find((post) => post.sourceId === substackSource.id)
  assert.equal(post.id, 'substack-1234373801-1')
  assert.deepEqual((await store.get(`assets/${post.id}/${post.assets[0]}`)).body, image)
  assert.ok(
    signed.find(({ key, request }) => key === 'index.json' && request.headers.get('if-match'))
  )
  const readerRequest = signed.at(-1).request
  assert.equal(readerRequest.redirect, 'error')
  assert.ok(objects.has(`snapshots/${post.id}/${post.revision}/render.html`))
})

test('OCI index conflicts and failed uploads preserve the last readable index', async (t) => {
  const { store, objects, breakUploads } = bucket(t)
  await syncArchive({ store, client, delayMs: 0 })
  const original = await store.get('index.json')
  await assert.rejects(store.put('index.json', 'overwritten', { ifMatch: 'stale' }), {
    status: 412,
  })
  await assert.rejects(store.put('index.json', 'overwritten', { ifNoneMatch: '*' }), {
    status: 412,
  })
  assert.deepEqual((await store.get('index.json')).body, original.body)
  breakUploads()
  const failure = await syncArchive({ store, client, delayMs: 0 })
  assert.equal(failure.complete, false)
  assert.equal(failure.failed, 1)
  const index = JSON.parse(objects.get('index.json').body)
  assert.deepEqual(index.posts, JSON.parse(original.body).posts)
  await assert.rejects(store.get('../config'), /Invalid archive object key/)
  await assert.rejects(store.get('index.json', 1), /size limit/)
})

test('a concurrent OCI writer cannot erase newly added articles', async (t) => {
  const { store, objects } = bucket(t)
  await syncArchive({ store, client, delayMs: 0 })
  const concurrentClient = {
    ...client,
    json: async (url) => {
      if (url.includes('/archive?') && new URL(url).searchParams.get('offset') === '0') {
        const current = JSON.parse(objects.get('index.json').body)
        current.posts.push({
          ...current.posts[0],
          id: 'substack-1234373801-2',
          title: 'concurrent',
        })
        await store.put('index.json', JSON.stringify(current))
      }
      return client.json(url)
    },
  }
  const report = await syncArchive({ store, client: concurrentClient, delayMs: 0 })
  assert.equal(report.complete, false)
  assert.match(report.error, /412/)
  assert.equal(JSON.parse(objects.get('index.json').body).posts.length, 2)
})
