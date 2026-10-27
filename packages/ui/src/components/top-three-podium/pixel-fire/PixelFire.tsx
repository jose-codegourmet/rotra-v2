'use client'

import { useMediaQuery } from '@rotra/ui/hooks/use-media-query'
import { useEffect, useRef } from 'react'

const WIDTH = 48
const HEIGHT = 40

/** Canvas flame whose colour comes from the resolved accent token. */
export function PixelFire() {
  const ref = useRef<HTMLCanvasElement>(null)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  useEffect(() => {
    const canvas = ref.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const heat = new Uint8Array(WIDTH * HEIGHT)
    for (let x = 14; x < 34; x += 1) heat[(HEIGHT - 1) * WIDTH + x] = 3
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    const palette = [
      'transparent',
      `color-mix(in srgb, ${accent} 28%, transparent)`,
      `color-mix(in srgb, ${accent} 58%, transparent)`,
      accent,
    ]
    const step = () => {
      for (let y = 0; y < HEIGHT - 1; y += 1) {
        for (let x = 0; x < WIDTH; x += 1) {
          const below = heat[(y + 1) * WIDTH + x] ?? 0
          heat[y * WIDTH + x] =
            below > 0 && Math.random() > 0.28 ? below - (Math.random() > 0.7 ? 1 : 0) : 0
        }
      }
    }
    const draw = () => {
      context.clearRect(0, 0, WIDTH, HEIGHT)
      for (let y = 0; y < HEIGHT; y += 1) {
        for (let x = 0; x < WIDTH; x += 1) {
          const value = heat[y * WIDTH + x] ?? 0
          if (value) {
            context.fillStyle = palette[value] ?? 'transparent'
            context.fillRect(x, y, 1, 1)
          }
        }
      }
    }
    for (let i = 0; i < 36; i += 1) step()
    draw()
    if (reducedMotion) return
    let frame = 0
    let last = 0
    const animate = (time: number) => {
      if (time - last >= 60) {
        step()
        draw()
        last = time
      }
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [reducedMotion])
  return (
    <canvas
      ref={ref}
      aria-hidden
      width={WIDTH}
      height={HEIGHT}
      className="pointer-events-none absolute -top-10 left-1/2 h-[150px] w-[180px] -translate-x-1/2 [image-rendering:pixelated]"
    />
  )
}
