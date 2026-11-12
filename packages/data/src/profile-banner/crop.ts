/** Output size of the saved 5:2 banner (rotra-admin.html cropToWide, #765). */
const WIDTH = 1000
const HEIGHT = 400
/** Width over height: 5:2, the ratio of the owner's banner photo (D-2026-11-12-03). */
const RATIO = WIDTH / HEIGHT

/**
 * Centred 5:2 crop of an image file, scaled to 1000 × 400 and returned as a data URL (PNG stays PNG,
 * everything else becomes JPEG at 0.86). Browser only; rejects with Error('unreadable') when the
 * file is not a decodable image.
 */
export function cropProfileBannerToWide(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const width = Math.min(img.naturalWidth, img.naturalHeight * RATIO)
      const height = width / RATIO
      const canvas = document.createElement('canvas')
      canvas.width = WIDTH
      canvas.height = HEIGHT
      const context = canvas.getContext('2d')
      URL.revokeObjectURL(url)
      if (!context || !width) return reject(new Error('unreadable'))
      context.drawImage(
        img,
        (img.naturalWidth - width) / 2,
        (img.naturalHeight - height) / 2,
        width,
        height,
        0,
        0,
        WIDTH,
        HEIGHT,
      )
      resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.86))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('unreadable'))
    }
    img.src = url
  })
}
