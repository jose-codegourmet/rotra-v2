import qrcode from 'qrcode-generator'

const QUIET_ZONE = 4

export type ShareQrDrawing = { size: number; count: number; path: string }
export type ShareFormat = 'post' | 'story'

/** Encodes the exact public link with H correction and a four-module quiet zone. */
export function drawShareQr(link: string): ShareQrDrawing | null {
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
export async function loadShareLogo(url: string): Promise<HTMLImageElement | null> {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  return new Promise((resolve) => {
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    // SVGs with a viewBox but no intrinsic size can rasterize as only their background.
    // Give the export image an explicit size without changing the on-screen asset.
    if (url.startsWith('data:image/svg+xml,')) {
      try {
        const doc = new DOMParser().parseFromString(
          decodeURIComponent(url.slice(url.indexOf(',') + 1)),
          'image/svg+xml',
        )
        const root = doc.documentElement
        const view = (root.getAttribute('viewBox') ?? '0 0 64 64').split(/\s+/).map(Number)
        root.setAttribute('width', String(view[2] || 64))
        root.setAttribute('height', String(view[3] || 64))
        image.src = `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(root))}`
      } catch {
        image.src = url
      }
    } else image.src = url
  })
}

/** Rasterizes the current card's measured layout, so wrapped copy and both formats match the preview. */
export async function renderSharePng(
  card: HTMLElement,
  qr: ShareQrDrawing,
  logos: Record<string, HTMLImageElement | null>,
  format: ShareFormat,
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
      const logo = logos[element.getAttribute('data-qr-logo') ?? ''] ?? null
      if (logo) {
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
    for (const cell of card.querySelectorAll<HTMLElement>('[data-share-cell]')) {
      const r = rect(cell)
      const style = getComputedStyle(cell)
      ctx.fillStyle = style.backgroundColor
      ctx.beginPath()
      ctx.roundRect(r.x, r.y, r.w, r.h, 2)
      ctx.fill()
      if (cell.getAttribute('data-share-cell') === 'current') {
        ctx.strokeStyle = palette.getPropertyValue('--share-accent').trim()
        ctx.lineWidth = 1
        ctx.strokeRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4)
      }
    }
    // Range rectangles preserve the browser's wrapping, alignment, and letter spacing in the PNG.
    for (const element of card.querySelectorAll<HTMLElement>(
      '[data-qr-text], [data-qr-logo] > span',
    )) {
      const style = getComputedStyle(element)
      ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      ctx.fillStyle = style.color
      ctx.save()
      const textBounds = rect(element)
      const clipped = ['hidden', 'clip'].includes(style.overflowX)
      const ellipsis =
        clipped && style.textOverflow === 'ellipsis' && element.scrollWidth > element.clientWidth
      const ellipsisWidth = ellipsis ? ctx.measureText('…').width : 0
      if (clipped) {
        ctx.beginPath()
        ctx.rect(textBounds.x, textBounds.y, textBounds.w, textBounds.h)
        ctx.clip()
      }
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
          if (!ellipsis || r.right - bounds.left <= textBounds.x + textBounds.w - ellipsisWidth) {
            ctx.fillText(
              style.textTransform === 'uppercase' ? character.toUpperCase() : character,
              r.left - bounds.left,
              baseline,
            )
          } else if (ellipsis) {
            ctx.fillText('…', textBounds.x + textBounds.w - ellipsisWidth, baseline)
          }
          i += character.length
        }
        node = walker.nextNode()
      }
      ctx.restore()
    }
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  } catch {
    return null
  }
}
