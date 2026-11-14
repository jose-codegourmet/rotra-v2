import qrcode from 'qrcode-generator'

const QUIET_ZONE = 4

export type ShareQrDrawing = { size: number; count: number; path: string }
/** Story (9:16), Facebook post (4:5) and Square (1:1). */
export type ShareFormat = 'post' | 'story' | 'square'

/** On-screen size of each share image (the prototypes' SH_SIZE); the PNG is 1080 px wide. */
export const SHARE_IMAGE_SIZE = {
  story: [270, 480],
  post: [320, 400],
  square: [320, 320],
} as const satisfies Record<ShareFormat, readonly [number, number]>

/** The three sizes every share dialog offers, in the prototypes' SHARE_FMTS order and copy. */
export const SHARE_FORMATS = [
  { format: 'story', label: 'Story', hint: '9:16 · Facebook and Instagram stories' },
  { format: 'post', label: 'Facebook post', hint: '4:5 · Facebook feed' },
  { format: 'square', label: 'Square', hint: '1:1 · Instagram feed' },
] as const satisfies readonly { format: ShareFormat; label: string; hint: string }[]

/** PNG height for each format at 1080 px wide. */
const PNG_HEIGHT: Record<ShareFormat, number> = { post: 1350, story: 1920, square: 1080 }

/** First letters of the first two words, upper-cased ("Mikee Abellana" → "MA"); same as Avatar's. */
export function shareInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

/** Draws an on-screen SVG (the ROTRA logo) into the canvas with its computed fills. */
async function drawSvg(
  ctx: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  r: { x: number; y: number; w: number; h: number },
) {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const source = [svg, ...svg.querySelectorAll('*')]
  const copy = [clone, ...clone.querySelectorAll('*')]
  source.forEach((element, index) => {
    const target = copy[index]
    if (!target) return
    const style = getComputedStyle(element)
    target.removeAttribute('class')
    if (element !== svg && style.fill) target.setAttribute('fill', style.fill)
  })
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(r.w))
  clone.setAttribute('height', String(r.h))
  const image = new Image()
  await new Promise<void>((resolve) => {
    image.onload = () => resolve()
    image.onerror = () => resolve()
    image.src = `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`
  })
  if (image.naturalWidth) ctx.drawImage(image, r.x, r.y, r.w, r.h)
}

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

/** Rasterizes the current card's measured layout, so wrapped copy and every format match the preview. */
export async function renderSharePng(
  card: HTMLElement,
  /** Null for share images without a QR (every share except the Session and club invites). */
  qr: ShareQrDrawing | null,
  logos: Record<string, HTMLImageElement | null>,
  format: ShareFormat,
): Promise<Blob | null> {
  try {
    await document.fonts.ready
    const bounds = card.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return null
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = PNG_HEIGHT[format]
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.scale(1080 / bounds.width, canvas.height / bounds.height)
    const palette = getComputedStyle(card)
    ctx.beginPath()
    ctx.roundRect(0, 0, bounds.width, bounds.height, 20)
    ctx.clip()
    ctx.fillStyle = palette.getPropertyValue('--share-bg').trim()
    ctx.fillRect(0, 0, bounds.width, bounds.height)
    // Same elliptical glow as the preview's 120% × 70% radial gradient (top: stop 60%, bottom: 70%).
    const glowBottom = card.dataset.shareGlow === 'bottom'
    ctx.save()
    ctx.scale(1.2 * bounds.width, 0.7 * bounds.height)
    const glowY = glowBottom ? 1 / 0.7 : 0
    const glowStop = glowBottom ? 0.7 : 0.6
    const glow = ctx.createRadialGradient(0.5 / 1.2, glowY, 0, 0.5 / 1.2, glowY, glowStop)
    glow.addColorStop(0, palette.getPropertyValue('--share-glow').trim())
    glow.addColorStop(1, 'transparent')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, 1 / 1.2, 1 / 0.7)
    ctx.restore()

    const rect = (element: Element) => {
      const r = element.getBoundingClientRect()
      return { x: r.left - bounds.left, y: r.top - bounds.top, w: r.width, h: r.height }
    }
    // Row tints and dividers go first so they sit under the avatars.
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
      } else if (element.dataset.shareInitials && element.querySelector('img')) {
        // The screen shows a picture the canvas cannot use (no CORS headers): draw the initials,
        // as the screen would without the picture. Without an <img> the text pass draws them.
        ctx.font = `800 ${Math.round(r.h * 0.35)}px ${style.fontFamily}`
        ctx.fillStyle = style.color
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(element.dataset.shareInitials, r.x + r.w / 2, r.y + r.h / 2)
      }
      ctx.restore()
      if (element.hasAttribute('data-share-winner')) {
        ctx.save()
        ctx.strokeStyle = palette.getPropertyValue('--share-accent').trim()
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2, radius + 1)
        ctx.stroke()
        ctx.restore()
      }
      if (element.hasAttribute('data-qr-tile')) {
        const svg = element.querySelector('svg')
        if (!svg || !qr) return null
        const code = rect(svg)
        ctx.save()
        ctx.translate(code.x, code.y)
        ctx.scale(code.w / qr.size, code.h / qr.size)
        ctx.fillStyle = palette.getPropertyValue('--qr-fg').trim()
        ctx.fill(new Path2D(qr.path))
        ctx.restore()
      }
    }
    // The ROTRA logo artwork (RotraLogo tone="dark") is drawn from its visible SVG.
    for (const logo of card.querySelectorAll<HTMLElement>('[data-share-logo]'))
      for (const svg of logo.querySelectorAll('svg')) {
        const r = rect(svg)
        if (r.w && r.h) await drawSvg(ctx, svg, r)
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
