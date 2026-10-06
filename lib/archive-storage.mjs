import { promises as fs } from 'node:fs'
import path from 'node:path'

async function resolveMissing(value) {
  try {
    return await fs.realpath(value)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    const parent = path.dirname(value)
    if (parent === value) throw error
    return path.join(await resolveMissing(parent), path.basename(value))
  }
}

export async function privateStorage(root, projectRoot = process.cwd()) {
  if (!root || !path.isAbsolute(root))
    throw new Error('Archive storage must be an absolute path outside the project')
  const storage = await resolveMissing(path.resolve(root))
  const project = await fs.realpath(projectRoot)
  if (storage === project || storage.startsWith(project + path.sep))
    throw new Error('Archive storage must be outside the project and build context')
  return storage
}
