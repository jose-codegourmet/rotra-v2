import qrcode from 'qrcode-generator'

/** Modules of quiet zone around the code (the prototype's pad). */
const QUIET_ZONE = 2

export type QrDrawing = { size: number; path: string }

/**
 * Encodes exactly `text` (error correction M) as one SVG path of 1×1 module squares, like the
 * prototype's qrSVG(). Returns null when the encoder fails, so the caller shows the text fallback.
 */
export function drawQr(text: string): QrDrawing | null {
  try {
    const code = qrcode(0, 'M')
    code.addData(text)
    code.make()
    const count = code.getModuleCount()
    let path = ''
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (code.isDark(row, col)) path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`
      }
    }
    return { size: count + QUIET_ZONE * 2, path }
  } catch {
    return null
  }
}
