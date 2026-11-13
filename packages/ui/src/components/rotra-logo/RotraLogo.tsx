import { cn } from '@rotra/ui/cn'
import { ROTRA_LOGO_ARTWORK } from './RotraLogo.artwork'

export type RotraLogoProps = {
  /** `full` symbol and name, `mini` symbol only, `responsive` full above 420 px and mini at 420 px and narrower */
  variant?: 'full' | 'mini' | 'responsive'
  /**
   * `theme` shows the Dark BG artwork in the dark theme and the Light BG artwork in the light theme.
   * `dark` always shows the Dark BG artwork: fixed-dark surfaces (share images, the Session QR card).
   */
  tone?: 'theme' | 'dark'
  /** Sets the height (the width follows the artwork): h-[26px] top bars, h-[52px] sign-in, h-5 share images */
  className?: string
}

type Art = (typeof ROTRA_LOGO_ARTWORK)[keyof typeof ROTRA_LOGO_ARTWORK]

function Artwork({ art, className }: { art: Art; className?: string }) {
  return (
    <svg
      viewBox={art.viewBox}
      aria-hidden="true"
      focusable="false"
      className={cn('block h-full w-auto', className)}
    >
      {art.body}
    </svg>
  )
}

/**
 * The ROTRA logo (docs/branding/materials/logo), replacing the old “ROTRA” text wordmark. Its accessible
 * name is “ROTRA”. The `dark` tone carries data-share-logo so share image export draws it into the PNG.
 */
export function RotraLogo({ variant = 'full', tone = 'theme', className }: RotraLogoProps) {
  const pair = (kind: 'full' | 'mini') => {
    const dark = kind === 'full' ? ROTRA_LOGO_ARTWORK.fullDark : ROTRA_LOGO_ARTWORK.miniDark
    const light = kind === 'full' ? ROTRA_LOGO_ARTWORK.fullLight : ROTRA_LOGO_ARTWORK.miniLight
    return tone === 'dark' ? (
      <Artwork art={dark} />
    ) : (
      <>
        <Artwork art={dark} className="in-data-[theme=light]:hidden" />
        <Artwork art={light} className="hidden in-data-[theme=light]:block" />
      </>
    )
  }
  return (
    <span
      role="img"
      aria-label="ROTRA"
      data-share-logo={tone === 'dark' ? '' : undefined}
      className={cn('inline-flex h-[26px] shrink-0 items-center leading-none', className)}
    >
      {variant === 'responsive' ? (
        <>
          <span className="inline-flex h-full max-[420px]:hidden">{pair('full')}</span>
          <span className="hidden h-full max-[420px]:inline-flex">{pair('mini')}</span>
        </>
      ) : (
        pair(variant)
      )}
    </span>
  )
}
