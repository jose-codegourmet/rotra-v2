import qrcode from 'qrcode-generator'

// The QR image is the one place that must not follow the theme: scanners need dark modules on a
// light background, so the exported PNG uses fixed black on white (functional exception to the
// no-hardcoded-colors rule).
const QR_DARK = '#000000'
const QR_LIGHT = '#ffffff'
const IMAGE_WIDTH = 1080
const PAD = 72
const QUIET_ZONE = 4

export type SessionQrImageInput = {
  /** The visitor public session link, exactly what the QR encodes */
  link: string
  /** Lines printed above the code: club name, then day/date/time · venue */
  titleLines: string[]
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > maxWidth) {
      out.push(line)
      line = word
    } else line = next
  }
  if (line) out.push(line)
  return out
}

/** Renders the shareable PNG: white quiet zone, session title lines, the QR and the link. Null when encoding or canvas fails. */
export async function renderSessionQrPng({
  link,
  titleLines,
}: SessionQrImageInput): Promise<Blob | null> {
  try {
    const code = qrcode(0, 'M')
    code.addData(link)
    code.make()
    const count = code.getModuleCount()
    const inner = IMAGE_WIDTH - PAD * 2
    const cell = Math.floor(inner / (count + QUIET_ZONE * 2))
    const qrSide = cell * (count + QUIET_ZONE * 2)
    const textWidth = IMAGE_WIDTH - PAD * 2

    const measure = document.createElement('canvas').getContext('2d')
    if (!measure) return null
    const font = (weight: number, px: number) =>
      `${weight} ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`
    const lines: { text: string; weight: number; px: number }[] = []
    titleLines.forEach((t, i) => {
      const px = i === 0 ? 56 : 38
      measure.font = font(i === 0 ? 700 : 500, px)
      for (const text of wrap(measure, t, textWidth))
        lines.push({ text, weight: i === 0 ? 700 : 500, px })
    })
    measure.font = font(400, 30)
    const linkLines = wrap(measure, link.replace(/(.{28})/g, '$1 '), textWidth).map((text) => ({
      text: text.replace(/ /g, ''),
      weight: 400,
      px: 30,
    }))

    const titleHeight = lines.reduce((h, l) => h + l.px * 1.3, 0)
    const linkHeight = linkLines.reduce((h, l) => h + l.px * 1.4, 0)
    const height = Math.ceil(PAD + titleHeight + 24 + qrSide + 16 + linkHeight + PAD)

    const canvas = document.createElement('canvas')
    canvas.width = IMAGE_WIDTH
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = QR_LIGHT
    ctx.fillRect(0, 0, IMAGE_WIDTH, height)
    ctx.fillStyle = QR_DARK
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    let y = PAD
    for (const l of lines) {
      ctx.font = font(l.weight, l.px)
      ctx.fillText(l.text, IMAGE_WIDTH / 2, y)
      y += l.px * 1.3
    }
    y += 24
    const x0 = (IMAGE_WIDTH - qrSide) / 2
    for (let r = 0; r < count; r++)
      for (let c = 0; c < count; c++)
        if (code.isDark(r, c))
          ctx.fillRect(x0 + (c + QUIET_ZONE) * cell, y + (r + QUIET_ZONE) * cell, cell, cell)
    y += qrSide + 16
    for (const l of linkLines) {
      ctx.font = font(l.weight, l.px)
      ctx.fillText(l.text, IMAGE_WIDTH / 2, y)
      y += l.px * 1.4
    }
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  } catch {
    return null
  }
}
