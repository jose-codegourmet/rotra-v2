/// <reference path="./libheif.d.ts" />

/** libheif applies HEIF container transformations while decoding. No native browser codec needed. */
export async function decodeHeif(buffer: Uint8Array) {
  const { default: initialize } = await import('libheif-js/libheif-wasm/libheif-bundle.mjs')
  const libheif = await initialize()
  const images = new libheif.HeifDecoder().decode(buffer)
  try {
    const image = images[0]
    if (!image) throw new Error('That HEIC/HEIF photo could not be decoded.')
    const width = image.get_width(),
      height = image.get_height()
    if (width < 1 || height < 1 || width * height > 24_000_000 || images.length > 8)
      throw new Error(
        'Choose a HEIC/HEIF photo with fewer than 24 million pixels and at most 8 images.',
      )
    const data = new Uint8ClampedArray(width * height * 4)
    await new Promise<void>((resolve, reject) => {
      image.display({ data, width, height }, (result) =>
        result ? resolve() : reject(new Error('That HEIC/HEIF photo could not be decoded.')),
      )
    })
    return { data, width, height }
  } finally {
    for (const image of images) image.free()
  }
}
