'use client'
import { firePalette } from '@rotra/ui/fire-palette'
import { useMediaQuery } from '@rotra/ui/hooks/use-media-query'
import { useEffect, useRef } from 'react'
import '../TopThreePodium.css'

const WIDTH = 48
const HEIGHT = 40
const HEAT = 36

/** Prototype fireStep/fireDraw port: 37 heat levels preserve the rising tongue of flame. */
export function PixelFire() {
  const ref = useRef<HTMLCanvasElement>(null)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  useEffect(() => {
    const canvas = ref.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const heat = new Uint8Array(WIDTH * HEIGHT)
    for (let x = 0; x < WIDTH; x++) {
      const distance = Math.abs(x - WIDTH / 2) / (WIDTH / 2)
      heat[(HEIGHT - 1) * WIDTH + x] =
        distance < 0.3
          ? HEAT
          : distance < 0.62
            ? Math.round(HEAT * (1 - (distance - 0.3) / 0.32))
            : 0
    }
    const step = () => {
      for (let x = 0; x < WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++) {
          const source = y * WIDTH + x
          const value = heat[source] ?? 0
          if (!value) {
            heat[source - WIDTH] = 0
            continue
          }
          const random = Math.floor(Math.random() * 4)
          const destination = source - random + 1 - WIDTH
          if (destination >= 0)
            heat[destination] = Math.max(0, value - (random & 1) - (Math.random() < 0.55 ? 1 : 0))
        }
    }
    let palette: number[][] = []
    const updatePalette = () => {
      palette = firePalette(HEAT) ?? palette
    }
    const draw = () => {
      const frame = context.createImageData(WIDTH, HEIGHT)
      heat.forEach((value, index) => {
        const colour = palette[value] ?? [0, 0, 0, 0]
        const x = index % WIDTH
        const side = Math.max(0, 1 - ((x - WIDTH / 2) / (WIDTH * 0.42)) ** 2)
        frame.data.set(
          [colour[0] ?? 0, colour[1] ?? 0, colour[2] ?? 0, Math.round((colour[3] ?? 0) * side)],
          index * 4,
        )
      })
      context.putImageData(frame, 0, 0)
    }
    updatePalette()
    for (let index = 0; index < 60; index++) step()
    draw()
    const observer = new MutationObserver(() => {
      updatePalette()
      draw()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    let frameId = 0,
      last = 0
    const animate = (time: number) => {
      if (time - last > 60) {
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
  }, [reducedMotion])
  return <canvas ref={ref} aria-hidden width={WIDTH} height={HEIGHT} className="rotra-fire" />
}
