import { JetBrains_Mono, Manrope } from 'next/font/google'

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

export const fontVariables = `${manrope.variable} ${jetbrainsMono.variable}`
