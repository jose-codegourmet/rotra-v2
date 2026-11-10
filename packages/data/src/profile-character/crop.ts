/** Output side of the saved square (rotra-admin.html cropToSquare). */
const SIDE = 192

/**
 * Centred square crop of an image file, scaled to 192 px and returned as a data URL (PNG stays PNG,
 * everything else becomes JPEG at 0.86). Browser only; rejects with Error('unreadable') when the
 * file is not a decodable image. Mock mode keeps the result in memory; real mode will upload it.
 */
export function cropProfileCharacterToSquare(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      const canvas = document.createElement('canvas')
      canvas.width = SIDE
      canvas.height = SIDE
      const context = canvas.getContext('2d')
      URL.revokeObjectURL(url)
      if (!context || !side) return reject(new Error('unreadable'))
      context.drawImage(
        img,
        (img.naturalWidth - side) / 2,
        (img.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        SIDE,
        SIDE,
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
