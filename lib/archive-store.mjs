import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { fetch, EnvHttpProxyAgent } from 'undici'
import { privateStorage } from './archive-storage.mjs'

const digest = (body) => createHash('sha256').update(body).digest('hex')
function validKey(key) {
  if (
    !/^[a-zA-Z0-9_./-]+$/.test(key) ||
    key.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new Error('Invalid archive object key')
}

export async function localStore(directory) {
  const root = await privateStorage(directory)
  return {
    root,
    async get(key, maxBytes = 128 * 1024 * 1024) {
      validKey(key)
      try {
        const canonicalRoot = await fs.realpath(root)
        const file = await fs.realpath(path.join(root, key))
        if (!file.startsWith(canonicalRoot + path.sep))
          throw new Error('Archive path escaped storage')
        const handle = await fs.open(file, 'r')
        try {
          const stat = await handle.stat()
          if (!stat.isFile() || stat.size > maxBytes) throw new Error('Invalid archive file size')
          const body = await handle.readFile()
          return { body, etag: digest(body) }
        } finally {
          await handle.close()
        }
      } catch (error) {
        if (error.code === 'ENOENT') return null
        throw error
      }
    },
    async put(key, value, { ifMatch, ifNoneMatch } = {}) {
      validKey(key)
      const existing = await this.get(key)
      if ((ifMatch && existing?.etag !== ifMatch) || (ifNoneMatch === '*' && existing)) {
        throw Object.assign(new Error('Archive write conflict'), { status: 412 })
      }
      const file = path.join(root, key)
      const parent = await privateStorage(path.dirname(file))
      if (parent !== root && !parent.startsWith(root + path.sep))
        throw new Error('Archive path escaped storage')
      await fs.mkdir(parent, { recursive: true, mode: 0o700 })
      const temporary = `${file}.${randomUUID()}.tmp`
      try {
        await fs.writeFile(temporary, value, { flag: 'wx', mode: 0o600 })
        await fs.rename(temporary, file)
      } finally {
        await fs.rm(temporary, { force: true })
      }
    },
    async close() {},
  }
}

// Native OCI API provides conditional writes, using the existing OCI API-key format.
export function ociStore({ namespace, bucket, region, signer, transport = fetch }) {
  if (
    !/^[a-zA-Z0-9_-]+$/.test(namespace || '') ||
    !/^[a-zA-Z0-9_.-]+$/.test(bucket || '') ||
    !/^[a-z]+-[a-z]+-[0-9]+$/.test(region || '')
  )
    throw new Error('Invalid OCI archive configuration')
  const base = `https://objectstorage.${region}.oraclecloud.com/n/${namespace}/b/${bucket}/o/`
  const dispatcher = new EnvHttpProxyAgent()
  async function request(method, key, { body, ifMatch, ifNoneMatch, maxBytes } = {}) {
    validKey(key)
    const headers = new Headers()
    if (ifMatch) headers.set('if-match', ifMatch)
    if (ifNoneMatch) headers.set('if-none-match', ifNoneMatch)
    if (body !== undefined) {
      body = Buffer.from(body)
      headers.set('content-type', 'application/octet-stream')
      headers.set('content-length', String(body.byteLength))
      headers.set('opc-content-sha256', createHash('sha256').update(body).digest('base64'))
    }
    const uri = base + encodeURIComponent(key)
    // OCI Object Storage PUT permits signing without body headers. Avoid SDK text conversion
    // of binary images; opc-content-sha256 still makes OCI check the uploaded bytes.
    await signer.signHttpRequest({ method, uri, headers, body }, method === 'PUT')
    const response = await transport(uri, {
      method,
      headers,
      body,
      dispatcher,
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
    })
    if (method === 'GET' && response.status === 404) {
      await response.body?.cancel()
      return null
    }
    if (!response.ok) {
      await response.body?.cancel()
      throw Object.assign(new Error(`OCI Object Storage ${method}: HTTP ${response.status}`), {
        status: response.status,
      })
    }
    if (method === 'PUT') {
      await response.body?.cancel()
      return
    }
    if (Number(response.headers.get('content-length')) > maxBytes) {
      await response.body?.cancel()
      throw new Error('Archive object exceeds size limit')
    }
    const parts = []
    let size = 0
    for await (const part of response.body) {
      size += part.byteLength
      if (size > maxBytes) throw new Error('Archive object exceeds size limit')
      parts.push(Buffer.from(part))
    }
    const etag = response.headers.get('etag')
    if (!etag) throw new Error('OCI archive response is missing ETag')
    return { body: Buffer.concat(parts), etag }
  }
  return {
    get: (key, maxBytes = 128 * 1024 * 1024) => request('GET', key, { maxBytes }),
    put: (key, body, conditions = {}) => request('PUT', key, { body, ...conditions }),
    close: () => dispatcher.close(),
  }
}

export async function createArchiveStore(env = process.env) {
  if (!env.ARCHIVE_STORAGE || env.ARCHIVE_STORAGE === 'local') return localStore(env.ARCHIVE_DIR)
  if (env.ARCHIVE_STORAGE !== 'oci') throw new Error('ARCHIVE_STORAGE must be local or oci')
  const { ConfigFileAuthenticationDetailsProvider, DefaultRequestSigner } = await import(
    'oci-common'
  )
  const provider = new ConfigFileAuthenticationDetailsProvider(
    env.OCI_CONFIG_FILE,
    env.OCI_CONFIG_PROFILE
  )
  return ociStore({
    namespace: env.ARCHIVE_NAMESPACE,
    bucket: env.ARCHIVE_BUCKET,
    region: provider.getRegion().regionId,
    signer: new DefaultRequestSigner(provider),
  })
}

export async function putImmutable(store, key, body) {
  try {
    await store.put(key, body, { ifNoneMatch: '*' })
  } catch (error) {
    if (error.status !== 412) throw error
    // A hash-named object must have exactly the bytes its name/revision promises.
    if (!key.endsWith('/metadata.json')) {
      const existing = await store.get(key)
      if (!existing?.body.equals(Buffer.from(body)))
        throw new Error('Archive immutable object differs')
    }
  }
}
