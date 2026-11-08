import qrcode from 'qrcode-generator'

const QUIET_ZONE = 4

export type SessionQrDrawing = { size: number; count: number; path: string }
export type SessionQrFormat = 'post' | 'story'

/** Encodes the exact public link with H correction and a four-module quiet zone. */
export function drawSessionQr(link: string): SessionQrDrawing | null {
  if (!link) return null
  try {
    const code = qrcode(0, 'H')
    code.addData(link)
    code.make()
    const count = code.getModuleCount()
    let path = ''
    for (let row = 0; row < count; row++)
      for (let col = 0; col < count; col++)
        if (code.isDark(row, col)) path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`
    return { count, size: count + QUIET_ZONE * 2, path }
  } catch {
    return null
  }
}

/** CORS-enabled images can be included in the PNG; failures use the same initials fallback. */
export async function loadSessionQrLogo(url: string): Promise<HTMLImageElement | null> {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  return new Promise((resolve) => {
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = url
  })
}

/** Rasterizes the current card's measured layout, so wrapped copy and both formats match the preview. */
export async function renderSessionQrPng(
  card: HTMLElement,
  qr: SessionQrDrawing,
  logo: HTMLImageElement | null,
  format: SessionQrFormat,
): Promise<Blob | null> {
  try {
    await document.fonts.ready
    const bounds = card.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return null
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = format === 'post' ? 1350 : 1920
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.scale(1080 / bounds.width, canvas.height / bounds.height)
    const palette = getComputedStyle(card)
    ctx.beginPath()
    ctx.roundRect(0, 0, bounds.width, bounds.height, 20)
    ctx.clip()
    ctx.fillStyle = palette.getPropertyValue('--share-bg').trim()
    ctx.fillRect(0, 0, bounds.width, bounds.height)
    // Same elliptical glow as the preview's 120% × 70% radial gradient.
    ctx.save()
    ctx.scale(1.2 * bounds.width, 0.7 * bounds.height)
    const glow = ctx.createRadialGradient(0.5 / 1.2, 0, 0, 0.5 / 1.2, 0, 0.6)
    glow.addColorStop(0, palette.getPropertyValue('--share-glow').trim())
    glow.addColorStop(1, 'transparent')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, 1 / 1.2, 1 / 0.7)
    ctx.restore()

    const rect = (element: Element) => {
      const r = element.getBoundingClientRect()
      return { x: r.left - bounds.left, y: r.top - bounds.top, w: r.width, h: r.height }
    }
    for (const element of card.querySelectorAll<HTMLElement>('[data-qr-tile], [data-qr-logo]')) {
      const r = rect(element)
      const style = getComputedStyle(element)
      const radius = style.borderRadius.endsWith('%')
        ? r.w / 2
        : Number.parseFloat(style.borderRadius)
      ctx.save()
      // White outer disc protects the center mark from surrounding QR modules.
      if (element.hasAttribute('data-qr-center')) {
        ctx.fillStyle = palette.getPropertyValue('--qr-bg').trim()
        ctx.beginPath()
        ctx.arc(r.x + r.w / 2, r.y + r.h / 2, r.w / 2 + 6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.beginPath()
      ctx.roundRect(r.x, r.y, r.w, r.h, radius)
      ctx.fillStyle = style.backgroundColor
      ctx.fill()
      ctx.clip()
      if (element.hasAttribute('data-qr-logo') && logo) {
        const side = Math.min(logo.naturalWidth, logo.naturalHeight)
        ctx.drawImage(
          logo,
          (logo.naturalWidth - side) / 2,
          (logo.naturalHeight - side) / 2,
          side,
          side,
          r.x,
          r.y,
          r.w,
          r.h,
        )
      }
      ctx.restore()
      if (element.hasAttribute('data-qr-tile')) {
        const svg = element.querySelector('svg')
        if (!svg) return null
        const code = rect(svg)
        ctx.save()
        ctx.translate(code.x, code.y)
        ctx.scale(code.w / qr.size, code.h / qr.size)
        ctx.fillStyle = palette.getPropertyValue('--qr-fg').trim()
        ctx.fill(new Path2D(qr.path))
        ctx.restore()
      }
    }
    // Range rectangles preserve the browser's wrapping, alignment, and letter spacing in the PNG.
    for (const element of card.querySelectorAll<HTMLElement>(
      '[data-qr-text], [data-qr-logo] > span',
    )) {
      const style = getComputedStyle(element)
      ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      ctx.fillStyle = style.color
      ctx.textBaseline = 'alphabetic'
      const metrics = ctx.measureText('Mg')
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
      let node = walker.nextNode()
      while (node) {
        const value = node.textContent ?? ''
        for (let i = 0; i < value.length; ) {
          const character = String.fromCodePoint(value.codePointAt(i) ?? 0)
          const range = document.createRange()
          range.setStart(node, i)
          range.setEnd(node, i + character.length)
          const r = range.getBoundingClientRect()
          const baseline =
            r.top -
            bounds.top +
            (r.height +
              (metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent) -
              (metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent)) /
              2
          ctx.fillText(character, r.left - bounds.left, baseline)
          i += character.length
        }
        node = walker.nextNode()
      }
    }
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  } catch {
    return null
  }
}
