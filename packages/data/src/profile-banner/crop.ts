/** Output size of the saved 3:1 banner (rotra-admin.html cropToWide). */
const WIDTH = 600
const HEIGHT = 200

/**
 * Centred 3:1 crop of an image file, scaled to 600 × 200 and returned as a data URL (PNG stays PNG,
 * everything else becomes JPEG at 0.86). Browser only; rejects with Error('unreadable') when the
 * file is not a decodable image.
 */
export function cropProfileBannerToWide(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const width = Math.min(img.naturalWidth, img.naturalHeight * 3)
      const height = width / 3
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
