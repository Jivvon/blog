import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { load } from 'cheerio'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import { fetch, EnvHttpProxyAgent } from 'undici'
import { sanitizeArchive, validateIndex, idPattern } from '../lib/archive-format.mjs'
import { privateStorage } from '../lib/archive-storage.mjs'

export const publicationUrl = 'https://1234373801.substack.com'
const mediaHosts = new Set(['substackcdn.com', 'substack-post-media.s3.amazonaws.com'])
const extensions = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
}
const sha = (value) => createHash('sha256').update(value).digest('hex')
const markdown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
markdown.use(gfm)

export function allowedUrl(value, media = false) {
  const url = new URL(value)
  if (
    url.protocol !== 'https:' ||
    url.port ||
    url.username ||
    url.password ||
    !(media ? mediaHosts.has(url.hostname) : url.origin === publicationUrl)
  )
    throw new Error('Unexpected archive download destination')
  return url
}

export function freeBody(post) {
  if (
    post.audience !== 'everyone' ||
    post.is_published === false ||
    post.has_paywall === true ||
    typeof post.body_html !== 'string' ||
    !post.body_html.trim()
  )
    return false
  const $ = load(post.body_html, null, false)
  if ($('[class*="paywall"], [data-testid="paywall"]').length) return false
  $('script, style, form').remove()
  return $.text().trim().length > 0 || $('img, iframe, video, audio').length > 0
}

export function makeHttpClient() {
  // Preserve the execution environment's proxy path and CA verification.
  const dispatcher = new EnvHttpProxyAgent()
  async function request(value, { media = false, maxBytes = 16 * 1024 * 1024 } = {}) {
    let url = allowedUrl(value, media)
    for (let hops = 0; hops < 4; hops++) {
      const response = await fetch(url, {
        dispatcher,
        redirect: 'manual',
        signal: AbortSignal.timeout(30000),
        headers: {
          'User-Agent': 'PersonalArchive/1.0',
          Accept: media ? 'image/*' : 'application/json',
        },
      })
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel()
        url = allowedUrl(new URL(response.headers.get('location'), url).href, media)
        continue
      }
      if (!response.ok) {
        await response.body?.cancel()
        throw new Error(`HTTP ${response.status} from ${url.hostname}`)
      }
      if (Number(response.headers.get('content-length')) > maxBytes) {
        await response.body?.cancel()
        throw new Error('Download exceeds size limit')
      }
      const parts = []
      let size = 0
      for await (const part of response.body) {
        size += part.byteLength
        if (size > maxBytes) {
          await response.body.cancel().catch(() => {})
          throw new Error('Download exceeds size limit')
        }
        parts.push(Buffer.from(part))
      }
      return {
        body: Buffer.concat(parts),
        type: (response.headers.get('content-type') || '').split(';')[0],
      }
    }
    throw new Error('Too many redirects')
  }
  return {
    request,
    json: async (url) => JSON.parse((await request(url)).body.toString('utf8')),
    close: () => dispatcher.close(),
  }
}

async function atomicJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
  const temporary = `${file}.${randomUUID()}.tmp`
  try {
    await fs.writeFile(temporary, JSON.stringify(data, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
    await fs.rename(temporary, file)
  } finally {
    await fs.rm(temporary, { force: true })
  }
}

async function existingIndex(root) {
  try {
    return validateIndex(JSON.parse(await fs.readFile(path.join(root, 'index.json'), 'utf8')))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return {
      schemaVersion: 1,
      publication: { name: '실리콘밸리 생존자', baseUrl: publicationUrl },
      capturedAt: null,
      posts: [],
    }
  }
}

async function savePost(root, post, client) {
  const id = String(post.id)
  if (!idPattern.test(id) || typeof post.slug !== 'string' || !/^[a-z0-9_-]+$/i.test(post.slug))
    throw new Error('Invalid post identifier')
  const sourceUrl = `${publicationUrl}/p/${post.slug}`
  const publishedAt = new Date(post.post_date).toISOString()
  const $ = load(post.body_html, null, false)
  $('script, style, form, input, button').remove()
  const assets = []
  const assetFailures = []
  for (const element of $('img').toArray()) {
    const image = $(element)
    const source = image.attr('src') || image.attr('data-src')
    try {
      allowedUrl(source, true)
      const download = await client.request(source, { media: true, maxBytes: 24 * 1024 * 1024 })
      const extension = extensions[download.type]
      if (!extension) throw new Error('Unsupported image format')
      const name = `${sha(download.body)}.${extension}`
      const directory = path.join(root, 'assets', id)
      await fs.mkdir(directory, { recursive: true, mode: 0o700 })
      try {
        await fs.writeFile(path.join(directory, name), download.body, { flag: 'wx', mode: 0o600 })
      } catch (error) {
        if (error.code !== 'EEXIST') throw error
      }
      assets.push(name)
      image.attr('src', `/library/assets/${id}/${name}`).removeAttr('srcset').removeAttr('data-src')
    } catch (error) {
      assetFailures.push({ source: source || '', reason: error.message })
      image.replaceWith($('<p>').text(`[이미지: ${image.attr('alt') || '원문에서 확인'}]`))
    }
  }
  for (const element of $('a').toArray()) {
    const anchor = $(element)
    try {
      anchor.attr('href', new URL(anchor.attr('href'), sourceUrl).href)
    } catch {
      anchor.removeAttr('href')
    }
  }
  for (const element of $('iframe, video, audio').toArray()) {
    const embed = $(element)
    const source = embed.attr('src') || embed.find('source').attr('src')
    const link = $('<a>').text('원문 미디어 열기 ↗')
    if (source) link.attr('href', source)
    embed.replaceWith(link)
  }
  const html = sanitizeArchive($.html())
  const text = load(html).text().replace(/\s+/g, ' ').trim()
  // A content revision includes local image outcomes; a later successful retry is a new revision.
  const revision = sha(post.body_html + '\n' + html)
  const metadata = {
    id,
    revision,
    title: post.title || post.slug,
    author: post.publishedBy?.[0]?.name || post.published_by?.name || '실리콘밸리 생존자',
    publishedAt,
    sourceUrl,
    excerpt: text.slice(0, 240),
    text,
    assets: [...new Set(assets)],
  }
  const parent = path.join(root, 'snapshots', id)
  const directory = path.join(parent, revision)
  const temporary = path.join(parent, `.${randomUUID()}.tmp`)
  await fs.mkdir(temporary, { recursive: true, mode: 0o700 })
  try {
    await fs.writeFile(path.join(temporary, 'raw.html'), post.body_html, { mode: 0o600 })
    await fs.writeFile(path.join(temporary, 'render.html'), html, { mode: 0o600 })
    await fs.writeFile(path.join(temporary, 'content.md'), markdown.turndown(html), { mode: 0o600 })
    await fs.writeFile(
      path.join(temporary, 'metadata.json'),
      JSON.stringify({ ...metadata, capturedAt: new Date().toISOString(), assetFailures }, null, 2),
      { mode: 0o600 }
    )
    try {
      await fs.rename(temporary, directory)
    } catch (error) {
      if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error
    }
  } finally {
    await fs.rm(temporary, { recursive: true, force: true })
  }
  return { metadata, assetFailures }
}

export async function syncArchive({ root, client, delayMs = 1000, maxPages = 10000 }) {
  root = await privateStorage(root, fileURLToPath(new URL('../', import.meta.url)))
  await fs.mkdir(root, { recursive: true, mode: 0o700 })
  const lock = path.join(root, '.sync-lock')
  await fs.mkdir(lock, { mode: 0o700 }) // Fail rather than run two writers or override a stale lock.
  const report = {
    schemaVersion: 1,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    listingComplete: false,
    complete: false,
    discovered: 0,
    archived: 0,
    excluded: 0,
    failed: 0,
    assetFailures: 0,
    posts: [],
  }
  try {
    const previous = await existingIndex(root)
    const indexed = new Map(previous.posts.map((post) => [post.id, post]))
    const discovered = new Map()
    const limit = 20
    for (let page = 0; page < maxPages; page++) {
      const posts = await client.json(
        `${publicationUrl}/api/v1/archive?sort=new&offset=${page * limit}&limit=${limit}`
      )
      if (!Array.isArray(posts)) throw new Error('Unexpected publication listing response')
      if (posts.length === 0) {
        report.listingComplete = true
        break
      }
      let added = 0
      for (const post of posts) {
        const id = String(post.id)
        if (!idPattern.test(id) || !post.slug) throw new Error('Invalid publication listing item')
        if (!discovered.has(id)) {
          discovered.set(id, post)
          added++
        }
      }
      report.discovered = discovered.size
      if (!added) throw new Error('Publication pagination repeated a page; listing is incomplete')
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    if (!report.listingComplete)
      throw new Error('Publication page limit reached; listing is incomplete')
    for (const item of discovered.values()) {
      const status = { id: String(item.id), slug: item.slug, status: '', reason: '' }
      try {
        if (['only_paid', 'paid', 'founding'].includes(item.audience)) {
          status.status = 'excluded'
          status.reason = 'Paid audience'
          report.excluded++
        } else {
          if (!/^[a-z0-9_-]+$/i.test(item.slug)) throw new Error('Invalid publication slug')
          const post = await client.json(
            `${publicationUrl}/api/v1/posts/${encodeURIComponent(item.slug)}`
          )
          if (String(post.id) !== String(item.id) || post.slug !== item.slug)
            throw new Error('Post identity differs from listing')
          if (!freeBody(post)) {
            if (post.audience === 'everyone')
              throw new Error('Public post body is missing or contains a paywall')
            if (!['only_paid', 'paid', 'founding'].includes(post.audience))
              throw new Error('Unknown post audience')
            status.status = 'excluded'
            status.reason = 'Paid audience'
            report.excluded++
          } else {
            const saved = await savePost(root, post, client)
            indexed.set(saved.metadata.id, saved.metadata)
            report.archived++
            report.assetFailures += saved.assetFailures.length
            status.status = 'archived'
            status.assetFailures = saved.assetFailures
          }
        }
      } catch (error) {
        status.status = 'failed'
        status.reason = error.message
        report.failed++
      }
      report.posts.push(status)
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    const index = validateIndex({
      ...previous,
      capturedAt: new Date().toISOString(),
      posts: [...indexed.values()].sort(
        (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
      ),
    })
    await atomicJson(path.join(root, 'index.json'), index)
    report.complete = report.failed === 0 && report.assetFailures === 0
  } catch (error) {
    report.error = error.message
  } finally {
    report.finishedAt = new Date().toISOString()
    try {
      await atomicJson(
        path.join(root, 'runs', `${report.startedAt.replace(/[:.]/g, '-')}.json`),
        report
      )
      await atomicJson(path.join(root, 'last-run.json'), report)
    } finally {
      await fs.rmdir(lock)
    }
  }
  return report
}

async function main() {
  const { values } = parseArgs({ options: { directory: { type: 'string' } } })
  const client = makeHttpClient()
  try {
    const report = await syncArchive({ root: values.directory || process.env.ARCHIVE_DIR, client })
    console.log(
      JSON.stringify(
        {
          discovered: report.discovered,
          archived: report.archived,
          excluded: report.excluded,
          failed: report.failed,
          assetFailures: report.assetFailures,
          complete: report.complete,
          error: report.error,
        },
        null,
        2
      )
    )
    if (!report.complete) process.exitCode = 1
  } finally {
    await client.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
