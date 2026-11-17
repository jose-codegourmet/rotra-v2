import { JetBrains_Mono, Manrope, Silkscreen } from 'next/font/google'

// Exposed as --nf-*; globals.css puts them into its --font, --mono and --pixel stacks.
export const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--nf-manrope',
  display: 'swap',
})

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--nf-mono',
  display: 'swap',
})

export const silkscreen = Silkscreen({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--nf-pixel',
  display: 'swap',
})

export const fontVariables = `${manrope.variable} ${jetbrainsMono.variable} ${silkscreen.variable}`
