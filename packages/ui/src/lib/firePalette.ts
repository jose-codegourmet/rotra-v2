/**
 * The pixel fires' palette (the prototype's firePalette / ppFirePal): `levels + 1` RGBA steps from
 * transparent through a dark accent to the accent, then toward white (more in dark mode). Read from
 * the theme's `--accent`, so it follows both themes; null when the accent isn't a hex colour yet.
 * Shared by the podium fire (PixelFire) and the profile stats fire (StatsFire).
 */
export function firePalette(levels: number): number[][] | null {
  const root = document.documentElement
  const accent = getComputedStyle(root).getPropertyValue('--accent').trim()
  const matched = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(accent)?.[1]
  if (!matched) return null
  const hex =
    matched.length === 3
      ? matched
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : matched
  const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16))
  const dark = root.dataset.theme !== 'light'
  const mix = (channel: number, amount: number, target: number) =>
    Math.round(channel + (target - channel) * amount)
  return Array.from({ length: levels + 1 }, (_, index) => {
    const t = index / levels
    if (!index) return [0, 0, 0, 0]
    const colour =
      t < 0.55
        ? channels.map((c) => mix(c * 0.35, t / 0.55, c))
        : channels.map((c) => mix(c, ((t - 0.55) / 0.45) * (dark ? 0.75 : 0.35), 255))
    return [...colour, t < 0.12 ? 0 : Math.round(255 * Math.min(1, (t - 0.12) * 2.2))]
  })
}
