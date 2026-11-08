import type { PictureCrop } from './picture'

const INPUT_LIMIT = 4 * 1024 * 1024
const TYPES = new Set([
  'image/webp',
  'image/gif',
  'image/png',
  'image/heic',
  'image/heif',
  'image/jpeg',
])

/** Local only. HEIC decoding is isolated in a terminable worker, never sent to Storage for preview. */
export async function preparePlayerPhoto(file: File, signal?: AbortSignal): Promise<File> {
  if (!file.size || file.size > INPUT_LIMIT) throw new Error('Choose a photo smaller than 4 MiB.')
  const header = new Uint8Array(await file.slice(0, 64).arrayBuffer())
  const signature = String.fromCharCode(...header)
  const heif =
    signature.slice(4, 8) === 'ftyp' &&
    !/avif|avis/.test(signature.slice(8, 12)) &&
    /heic|heix|hevc|hevx|mif1|msf1/.test(signature.slice(8))
  if (!heif && !TYPES.has(file.type))
    throw new Error('Choose a WebP, GIF, PNG, HEIC/HEIF or JPEG photo.')
  if (!heif) return file
  signal?.throwIfAborted()
  const worker = new Worker(new URL('./heif.worker.ts', import.meta.url), { type: 'module' })
  let timer: ReturnType<typeof setTimeout> | undefined
  let abort: (() => void) | undefined
  try {
    const image = await new Promise<{ data: Uint8ClampedArray; width: number; height: number }>(
      (resolve, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error('That HEIC/HEIF photo took too long to decode. Choose a smaller photo.'),
            ),
          12_000,
        )
        abort = () => reject(new Error('Photo preparation cancelled.'))
        signal?.addEventListener('abort', abort, { once: true })
        if (signal?.aborted) {
          abort()
          return
        }
        worker.onmessage = (event) => {
          clearTimeout(timer)
          if (event.data.error) reject(new Error(event.data.error))
          else resolve(event.data)
        }
        worker.onerror = () => {
          clearTimeout(timer)
          reject(new Error('That HEIC/HEIF photo could not be decoded.'))
        }
        void file.arrayBuffer().then(
          (buffer) => worker.postMessage(buffer),
          (cause) => {
            clearTimeout(timer)
            reject(cause)
          },
        )
      },
    )
    signal?.throwIfAborted()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    try {
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Photo editing is unavailable in this browser.')
      const data = context.createImageData(image.width, image.height)
      data.data.set(image.data)
      context.putImageData(data, 0, 0)
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) =>
            value ? resolve(value) : reject(new Error('That photo could not be prepared.')),
          'image/webp',
          0.92,
        ),
      )
      if (blob.size > INPUT_LIMIT)
        throw new Error(
          'That HEIC/HEIF photo is too large after conversion. Choose a smaller photo.',
        )
      return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: blob.type })
    } finally {
      canvas.width = 0
      canvas.height = 0
    }
  } finally {
    clearTimeout(timer)
    if (abort) signal?.removeEventListener('abort', abort)
    worker.terminate()
  }
}

/** Mock presentation only: wrap the original animated image instead of flattening it through canvas. */
export async function mockPhotoReference(file: File, crop?: PictureCrop): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error("Couldn't read that photo."))
    reader.onerror = reader.onabort = () => reject(new Error("Couldn't read that photo."))
    reader.readAsDataURL(file)
  })
  if (!crop) return source
  const image = new Image()
  image.src = source
  await image.decode()
  const w = image.naturalWidth,
    h = image.naturalHeight
  const rw = crop.rotation % 180 ? h : w,
    rh = crop.rotation % 180 ? w : h
  const side = Math.max(1, Math.floor(Math.min(rw, rh) / crop.zoom))
  const x = Math.round((rw - side) * crop.x),
    y = Math.round((rh - side) * crop.y)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}"><g transform="translate(${-x} ${-y}) translate(${rw / 2} ${rh / 2}) rotate(${crop.rotation})"><image href="${source}" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}"/></g></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}${file.type === 'image/gif' || file.type === 'image/webp' ? '#rotra-animated' : ''}`
}
