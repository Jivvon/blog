import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { isPrivate } from './profile'
import { privateStorage } from './archive-storage.mjs'
import {
  assetNamePattern,
  idPattern,
  hashPattern,
  sanitizeArchive,
  validateIndex,
} from './archive-format.mjs'

export interface ArchivedPost {
  id: string
  revision: string
  title: string
  author: string
  publishedAt: string
  sourceUrl: string
  excerpt: string
  text: string
  assets: string[]
}

export interface ArchiveIndex {
  schemaVersion: number
  publication: { name: string; baseUrl: string }
  capturedAt: string | null
  posts: ArchivedPost[]
}

async function archiveRoot() {
  if (!isPrivate) throw new Error('Archive is unavailable in the public build')
  const root = process.env.ARCHIVE_DIR
  if (!root || !path.isAbsolute(root))
    throw new Error('ARCHIVE_DIR must be an absolute private storage path')
  return privateStorage(root)
}

async function readInside(relative: string, maxBytes: number) {
  const root = await fs.realpath(await archiveRoot())
  const file = await fs.realpath(path.join(root, relative))
  if (!file.startsWith(root + path.sep)) throw new Error('Archive path escaped storage')
  const handle = await fs.open(file, 'r')
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.size > maxBytes) throw new Error('Invalid archive file size')
    return await handle.readFile()
  } finally {
    await handle.close()
  }
}

export async function readArchive(): Promise<ArchiveIndex> {
  // Check even when storage is missing, so public routes cannot read private files.
  await archiveRoot()
  try {
    return validateIndex(
      JSON.parse((await readInside('index.json', 128 * 1024 * 1024)).toString('utf8'))
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return {
      schemaVersion: 1,
      publication: { name: '실리콘밸리 생존자', baseUrl: 'https://1234373801.substack.com' },
      capturedAt: null,
      posts: [],
    }
  }
}

export async function readArticle(post: ArchivedPost) {
  if (!idPattern.test(post.id) || !hashPattern.test(post.revision))
    throw new Error('Invalid archive identifier')
  return sanitizeArchive(
    (
      await readInside(`snapshots/${post.id}/${post.revision}/render.html`, 16 * 1024 * 1024)
    ).toString('utf8')
  )
}

export async function readAsset(id: string, name: string) {
  if (!idPattern.test(id) || !assetNamePattern.test(name)) return null
  const index = await readArchive()
  if (!index.posts.some((post) => post.id === id && post.assets.includes(name))) return null
  const body = await readInside(`assets/${id}/${name}`, 24 * 1024 * 1024)
  const extension = path.extname(name).slice(1)
  const type = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    avif: 'image/avif',
  }[extension]!
  return { body, type }
}
