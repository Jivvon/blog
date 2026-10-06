import 'server-only'
import path from 'node:path'
import { isPrivate } from './profile'
import { createArchiveStore } from './archive-store.mjs'
import {
  assetNamePattern,
  idPattern,
  hashPattern,
  sanitizeArchive,
  validateIndex,
  emptyIndex,
} from './archive-format.mjs'

export interface ArchivedPost {
  id: string
  sourceId: string
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
  sources: { id: string; kind: string; name: string; baseUrl: string }[]
  capturedAt: string | null
  posts: ArchivedPost[]
}

async function archiveStore() {
  if (!isPrivate) throw new Error('Archive is unavailable in the public build')
  return createArchiveStore()
}

async function readInside(relative: string, maxBytes: number) {
  const store = await archiveStore()
  try {
    const object = await store.get(relative, maxBytes)
    if (!object) throw Object.assign(new Error('Archive object is missing'), { code: 'ENOENT' })
    return object.body
  } finally {
    await store.close()
  }
}

export async function readArchive(): Promise<ArchiveIndex> {
  // Check even when storage is missing, so public routes cannot read private files.
  try {
    return validateIndex(
      JSON.parse((await readInside('index.json', 128 * 1024 * 1024)).toString('utf8'))
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return emptyIndex()
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
