import { promises as fs } from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { allBlogs, allResumes, allAuthors } from '../.contentlayer/generated/index.mjs'

assert.equal(allBlogs.length, 0)
assert.equal(allResumes.length, 0)
assert.equal(allAuthors.length, 1)
const files = await fs.readdir('out', { recursive: true })
for (const file of files) {
  const relative = file.replaceAll(path.sep, '/')
  assert.ok(!/^(library|lab|api|blog|tags|resume|projects)(\/|\.|$)/.test(relative), relative)
  assert.ok(!/^(feed\.xml|search\.json|static\/files\/)/.test(relative), relative)
  if (!(await fs.stat(path.join('out', file))).isFile()) continue
  if (/\.(html|txt|json|js)$/.test(file))
    assert.doesNotMatch(
      await fs.readFile(path.join('out', file), 'utf8'),
      /PRIVATE_ARCHIVE_SENTINEL|CONTAINER_FIXTURE/
    )
}
assert.match(await fs.readFile('out/about.html', 'utf8'), /Jiwon Jeong/)
await fs.stat('out/404.html') // Pages must use a 404 rather than an SPA fallback.
assert.match(await fs.readFile('out/_redirects', 'utf8'), /^\/ \/about 302/m)
console.log('public export: about-only routes, empty private documents and no private data passed')
