import { JetBrains_Mono, Manrope, Silkscreen } from 'next/font/google'

export const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font',
  display: 'swap',
})

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--mono',
  display: 'swap',
})

/** Leaderboard podium only */
export const silkscreen = Silkscreen({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--pixel',
  display: 'swap',
})

export const fontVariables = `${manrope.variable} ${jetbrainsMono.variable} ${silkscreen.variable}`
