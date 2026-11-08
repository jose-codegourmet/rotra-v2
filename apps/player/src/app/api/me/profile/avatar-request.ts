import { decodeHeif } from '@rotra/data/player/heif'
import type { PictureCrop } from '@rotra/data/player/picture'
import type { AvatarChoice } from '@rotra/db/player/avatar'
import { ServiceError } from '@rotra/db/service/errors'
import { detectContentType } from 'next/dist/server/image-optimizer/detect-content-type'
import { getSharp } from 'next/dist/server/image-optimizer/transform'

const MAX_INPUT_BYTES = 4 * 1024 * 1024
const MAX_REQUEST_BYTES = MAX_INPUT_BYTES + 16 * 1024
const MAX_STORED_BYTES = 2 * 1024 * 1024
const MAX_PIXELS = 24_000_000
const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
])
const invalid = (message = 'That image could not be read.') =>
  new ServiceError('invalid', { picture: message })

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

/** Preserve GIF/WebP frame timing; rotate each coalesced frame to avoid multi-page rotation limits. */
async function normalizePhoto(
  file: File,
  crop: PictureCrop,
): Promise<Extract<AvatarChoice, { kind: 'photo' }>> {
  if (!file.size || file.size > MAX_INPUT_BYTES) throw invalid('Choose a photo smaller than 4 MiB.')
  try {
    const sharp = getSharp(null, false)
    const buffer = Buffer.from(await file.arrayBuffer())
    const header = buffer.toString('ascii', 0, 64)
    const heif =
      header.slice(4, 8) === 'ftyp' &&
      !/avif|avis/.test(header.slice(8, 12)) &&
      /heic|heix|hevc|hevx|mif1|msf1/.test(header.slice(8))
    const detected = heif ? 'image/heif' : await detectContentType(buffer)
    if (!detected || !IMAGE_TYPES.has(detected))
      throw invalid('Choose a WebP, GIF, PNG, HEIC/HEIF or JPEG photo.')
    if (
      file.type &&
      file.type !== detected &&
      !(heif && ['image/heic', 'image/heif'].includes(file.type))
    )
      throw invalid('The photo content does not match its file type. Export it again and retry.')
    const started = Date.now()
    let input: ReturnType<typeof sharp>
    if (heif) {
      const decoded = await decodeHeif(buffer)
      input = sharp(Buffer.from(decoded.data), {
        raw: { width: decoded.width, height: decoded.height, channels: 4 },
      })
    } else
      input = sharp(buffer, { animated: true, limitInputPixels: MAX_PIXELS, failOn: 'warning' })
    const metadata = await input.metadata()
    const pages = metadata.pages ?? 1
    const frameHeight = metadata.pageHeight ?? metadata.height
    if (
      !metadata.width ||
      !frameHeight ||
      pages > 120 ||
      metadata.width * frameHeight * pages > MAX_PIXELS
    )
      throw invalid(
        'Choose a smaller photo or animation (24 million total pixels, at most 120 frames).',
      )
    if (pages > 1 && detected !== 'image/gif' && detected !== 'image/webp')
      throw invalid('Use GIF or WebP for animated photos.')
    const { data, info } = await input
      .autoOrient()
      .ensureAlpha()
      .raw()
      .timeout({ seconds: 7 })
      .toBuffer({ resolveWithObject: true })
    const w = info.width,
      h = info.height / pages
    if (!Number.isInteger(h)) throw invalid()
    const rw = crop.rotation % 180 ? h : w,
      rh = crop.rotation % 180 ? w : h
    const side = Math.max(1, Math.floor(Math.min(rw, rh) / crop.zoom))
    const left = Math.round((rw - side) * crop.x),
      top = Math.round((rh - side) * crop.y)
    const size = Math.min(512, side, Math.floor(Math.sqrt(MAX_PIXELS / pages)))
    const frames: Buffer[] = []
    const stride = w * h * info.channels
    for (let page = 0; page < pages; page++) {
      if (Date.now() - started > 12_000)
        throw invalid('That animation took too long to process. Choose a smaller one.')
      frames.push(
        await sharp(data.subarray(page * stride, (page + 1) * stride), {
          raw: { width: w, height: h, channels: info.channels },
        })
          .rotate(crop.rotation)
          .extract({ left, top, width: side, height: side })
          .resize(size, size)
          .png()
          .timeout({ seconds: 7 })
          .toBuffer(),
      )
    }
    const first = frames[0]
    if (!first) throw invalid()
    const output = (
      pages === 1 ? sharp(first) : sharp(frames, { join: { animated: true } })
    ).timeout({ seconds: 7 })
    const animation = { delay: metadata.delay, loop: metadata.loop }
    const format = heif
      ? 'webp'
      : detected === 'image/jpeg'
        ? 'jpeg'
        : detected === 'image/gif'
          ? 'gif'
          : detected === 'image/webp'
            ? 'webp'
            : 'png'
    const bytes =
      format === 'gif'
        ? await output.gif(animation).toBuffer()
        : format === 'webp'
          ? await output.webp({ ...animation, quality: 90 }).toBuffer()
          : format === 'jpeg'
            ? await output.jpeg({ quality: 90 }).toBuffer()
            : await output.png().toBuffer()
    if (bytes.length > MAX_STORED_BYTES)
      throw invalid(
        'The finished picture exceeds 2 MiB. Choose a smaller photo or shorter animation.',
      )
    const types = {
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    } as const
    return {
      kind: 'photo',
      bytes,
      contentType: types[format],
      extension: format === 'jpeg' ? 'jpg' : format,
    }
  } catch (cause) {
    if (cause instanceof ServiceError) throw cause
    throw invalid(
      'That image could not be decoded safely. Choose a smaller photo or shorter animation.',
    )
  }
}

function readCrop(value: FormDataEntryValue | null): PictureCrop {
  if (value === null) return { x: 0.5, y: 0.5, zoom: 1, rotation: 0 }
  try {
    if (typeof value !== 'string') throw invalid()
    const crop = JSON.parse(value) as PictureCrop
    if (
      !crop ||
      ![crop.x, crop.y, crop.zoom, crop.rotation].every(Number.isFinite) ||
      crop.x < 0 ||
      crop.x > 1 ||
      crop.y < 0 ||
      crop.y > 1 ||
      crop.zoom < 1 ||
      crop.zoom > 3 ||
      ![0, 90, 180, 270].includes(crop.rotation)
    )
      throw invalid()
    return crop
  } catch {
    throw invalid('The crop is invalid. Reopen the picture editor and try again.')
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
    return {
      expectedRevision: revision,
      choice: await normalizePhoto(photo, readCrop(form.get('crop'))),
    }
  }
  throw invalid()
}
