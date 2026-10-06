import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID, createHash } from 'node:crypto'
import { parseArgs } from 'node:util'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { validateIndex, hashPattern, assetNamePattern, idPattern } from '../lib/archive-format.mjs'
import { privateStorage } from '../lib/archive-storage.mjs'

export async function backupArchive(source, target) {
  if (!path.isAbsolute(source) || !path.isAbsolute(target)) throw new Error('Use absolute paths')
  const projectRoot = fileURLToPath(new URL('../', import.meta.url))
  await privateStorage(source, projectRoot)
  await privateStorage(target, projectRoot)
  const root = await fs.realpath(source)
  const parent = await fs.realpath(path.dirname(target))
  const resolvedTarget = path.join(parent, path.basename(target))
  if (resolvedTarget === root || resolvedTarget.startsWith(root + path.sep))
    throw new Error('Backup must be outside the source archive')
  const lock = path.join(root, '.sync-lock')
  await fs.mkdir(lock)
  const temporary = path.join(parent, `.${randomUUID()}.archive-backup`)
  try {
    const index = validateIndex(
      JSON.parse(await fs.readFile(path.join(root, 'index.json'), 'utf8'))
    )
    await fs.mkdir(temporary, { mode: 0o700 })
    const copied = new Set()
    // Copy only files named by the validated index. Symlinks cannot pull in unrelated data.
    const copy = async (relative) => {
      if (copied.has(relative)) return
      const sourceFile = await fs.realpath(path.join(root, relative))
      if (!sourceFile.startsWith(root + path.sep))
        throw new Error('Archive symlink escaped storage')
      const destination = path.join(temporary, relative)
      await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 })
      await fs.copyFile(sourceFile, destination, fs.constants.COPYFILE_EXCL)
      await fs.chmod(destination, 0o600)
      copied.add(relative)
    }
    const copyRevision = async (id, revision) => {
      const prefix = `snapshots/${id}/${revision}`
      for (const file of ['raw.html', 'render.html', 'content.md', 'metadata.json'])
        await copy(`${prefix}/${file}`)
      const raw = await fs.readFile(path.join(temporary, prefix, 'raw.html'))
      const rendered = await fs.readFile(path.join(temporary, prefix, 'render.html'))
      const digest = createHash('sha256').update(raw).update('\n').update(rendered).digest('hex')
      if (digest !== revision) throw new Error('Archive revision checksum mismatch')
      const metadata = JSON.parse(
        await fs.readFile(path.join(temporary, prefix, 'metadata.json'), 'utf8')
      )
      if (
        !Array.isArray(metadata.assets) ||
        metadata.assets.some((name) => !assetNamePattern.test(name))
      )
        throw new Error('Invalid revision assets')
      for (const name of metadata.assets) {
        await copy(`assets/${id}/${name}`)
        const asset = await fs.readFile(path.join(temporary, 'assets', id, name))
        if (createHash('sha256').update(asset).digest('hex') !== name.split('.')[0])
          throw new Error('Archive image checksum mismatch')
      }
    }
    for (const post of index.posts) {
      await copyRevision(post.id, post.revision)
    }
    // Preserve prior immutable revisions, too; never replace a verified backup in place.
    const snapshots = path.join(root, 'snapshots')
    const ids = await fs.readdir(snapshots).catch((error) => {
      if (error.code === 'ENOENT') return []
      throw error
    })
    for (const id of ids) {
      if (!idPattern.test(id)) continue
      for (const revision of await fs.readdir(path.join(snapshots, id))) {
        if (
          !hashPattern.test(revision) ||
          index.posts.some((p) => p.id === id && p.revision === revision)
        )
          continue
        await copyRevision(id, revision)
      }
    }
    await copy('index.json')
    try {
      await copy('last-run.json')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    // mkdir is the no-overwrite guard, including for a dangling symlink at target.
    await fs.mkdir(resolvedTarget, { mode: 0o700 })
    for (const name of await fs.readdir(temporary))
      await fs.rename(path.join(temporary, name), path.join(resolvedTarget, name))
    return index.posts.length
  } finally {
    await fs.rm(temporary, { recursive: true, force: true })
    await fs.rmdir(lock)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({
    options: { source: { type: 'string' }, target: { type: 'string' } },
  })
  backupArchive(values.source || '', values.target || '')
    .then((count) =>
      console.log(`Copied and validated ${count} articles into a new backup directory`)
    )
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
}
