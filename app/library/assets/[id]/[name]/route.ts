import { isPrivate } from '../../../../../lib/profile'
import { readAsset } from '../../../../../lib/archive'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  if (!isPrivate) return new Response('Not found', { status: 404 })
  const { id, name } = await params
  const asset = await readAsset(id, name)
  if (!asset) return new Response('Not found', { status: 404 })
  return new Response(new Uint8Array(asset.body), {
    headers: {
      'Content-Type': asset.type,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, noarchive',
    },
  })
}
