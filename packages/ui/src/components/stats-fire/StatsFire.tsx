'use client'
import { cn } from '@rotra/ui/cn'
import { firePalette } from '@rotra/ui/fire-palette'
import { useMediaQuery } from '@rotra/ui/hooks/use-media-query'
import { useEffect, useRef } from 'react'

const WIDTH = 18
const HEIGHT = 22
const LEVELS = 36

/** CSS height of the fire: a 16 px ember at 1% up to a 52 px flame at 100%. */
export function statsFireHeight(rate: number) {
  return Math.round(16 + (Math.min(100, Math.max(0, rate)) / 100) * 36)
}

/**
 * The pixel fire beside the win rate in Latest stats (2026-11-13-profile-stats-redesign; the
 * prototype's ppFire): an 18 × 22 canvas drawn like the podium fire (same accent palette, rendered
 * pixelated) that grows from a 16 px ember at 1% to 52 px at 100% (width 0.82 × height) and burns
 * hotter as the rate rises. Nothing at 0%. Still with reduced motion. Decorative (aria-hidden).
 */
export function StatsFire({ rate, className }: { rate: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const heat = Math.round(16 + (Math.min(100, Math.max(0, rate)) / 100) * 20)
  useEffect(() => {
    const canvas = ref.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const buffer = new Uint8Array(WIDTH * HEIGHT)
    for (let x = 0; x < WIDTH; x++) {
      const distance = Math.abs(x - (WIDTH - 1) / 2) / (WIDTH / 2)
      buffer[(HEIGHT - 1) * WIDTH + x] =
        distance < 0.55
          ? heat
          : distance < 0.9
            ? Math.round(heat * (1 - (distance - 0.55) / 0.35))
            : 0
    }
    const step = () => {
      for (let x = 0; x < WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++) {
          const source = y * WIDTH + x
          const value = buffer[source] ?? 0
          if (!value) {
            buffer[source - WIDTH] = 0
            continue
          }
          const random = Math.floor(Math.random() * 3)
          const destination = source - random + 1 - WIDTH
          if (destination >= 0)
            buffer[destination] = Math.max(
              0,
              value - (random & 1) - (Math.random() < 0.5 ? 1 : 0),
            )
        }
    }
    let palette: number[][] = firePalette(LEVELS) ?? []
    const draw = () => {
      const frame = context.createImageData(WIDTH, HEIGHT)
      buffer.forEach((value, index) => {
        const colour = palette[Math.min(LEVELS, value)] ?? [0, 0, 0, 0]
        const x = index % WIDTH
        const side = Math.max(0, 1 - ((x - (WIDTH - 1) / 2) / (WIDTH * 0.5)) ** 2)
        frame.data.set(
          [colour[0] ?? 0, colour[1] ?? 0, colour[2] ?? 0, Math.round((colour[3] ?? 0) * side)],
          index * 4,
        )
      })
      context.putImageData(frame, 0, 0)
    }
    for (let index = 0; index < 40; index++) step()
    draw()
    const observer = new MutationObserver(() => {
      palette = firePalette(LEVELS) ?? palette
      draw()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    let frameId = 0,
      last = 0
    const animate = (time: number) => {
      if (time - last > 70) {
        step()
        draw()
        last = time
      }
      frameId = requestAnimationFrame(animate)
    }
    if (!reducedMotion) frameId = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [heat, reducedMotion])
  if (rate <= 0) return null
  const height = statsFireHeight(rate)
  return (
    <canvas
      ref={ref}
      aria-hidden
      width={WIDTH}
      height={HEIGHT}
      style={{ height, width: Math.round(height * 0.82) }}
      className={cn('-mb-0.5 block [image-rendering:pixelated]', className)}
    />
  )
}
