import type { AvatarChoice } from '@rotra/db/player/avatar'
import { ServiceError } from '@rotra/db/service/errors'
import { detectContentType } from 'next/dist/server/image-optimizer/detect-content-type'
import { getSharp, optimizeImage } from 'next/dist/server/image-optimizer/transform'

const MAX_REQUEST_BYTES = 4 * 1024 * 1024
const MAX_PIXELS = 24_000_000
const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/tiff',
])
const FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'heif', 'tiff'])
const invalid = () => new ServiceError('invalid', { picture: 'That image could not be read.' })

/** Bound the body while streaming, including requests that omit Content-Length. */
async function readForm(request: Request): Promise<FormData> {
  const declared = request.headers.get('content-length')
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_REQUEST_BYTES)) throw invalid()
  if (!request.body) throw invalid()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel()
        throw invalid()
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = Buffer.concat(chunks)
  const formRequest = new Request(request.url, {
    method: 'POST',
    headers: { 'content-type': request.headers.get('content-type') ?? '' },
    body: new Uint8Array(bytes).buffer,
  })
  return formRequest.formData().catch(() => {
    throw invalid()
  })
}

/** Uses the sharp already shipped with Next. This private Next API must be reviewed on upgrades. */
async function normalizePhoto(file: File): Promise<Buffer> {
  if (!IMAGE_TYPES.has(file.type) || !file.size || file.size > MAX_REQUEST_BYTES) throw invalid()
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const detected = await detectContentType(buffer)
    if (!detected || !IMAGE_TYPES.has(detected)) throw invalid()
    const metadata = await getSharp(null, false)(buffer, {
      limitInputPixels: MAX_PIXELS,
    }).metadata()
    if (!metadata.format || !FORMATS.has(metadata.format)) throw invalid()
    return await optimizeImage({
      buffer,
      contentType: 'image/png',
      quality: 90,
      width: 512,
      height: 512,
      limitInputPixels: MAX_PIXELS,
      sequentialRead: true,
      timeoutInSeconds: 7,
    })
  } catch {
    throw invalid()
  }
}

export async function readAvatarRequest(
  request: Request,
): Promise<{ expectedRevision: string; choice: AvatarChoice }> {
  const form = await readForm(request)
  const revision = form.get('expectedRevision')
  const kind = form.get('kind')
  if (typeof revision !== 'string') throw invalid()
  if (kind === 'initials') return { expectedRevision: revision, choice: { kind } }
  if (kind === 'character') {
    const id = form.get('id')
    if (typeof id !== 'string') throw invalid()
    return { expectedRevision: revision, choice: { kind, id } }
  }
  if (kind === 'photo') {
    const photo = form.get('photo')
    if (!(photo instanceof File)) throw invalid()
    return { expectedRevision: revision, choice: { kind, png: await normalizePhoto(photo) } }
  }
  throw invalid()
}
