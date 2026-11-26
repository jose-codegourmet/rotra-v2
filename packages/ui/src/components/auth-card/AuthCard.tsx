'use client'

import { useAuthArt } from '@rotra/ui/auth-art-provider'
import { Card } from '@rotra/ui/card'
import { cn } from '@rotra/ui/cn'
import { Notice } from '@rotra/ui/notice'
import { RotraLogo } from '@rotra/ui/rotra-logo'
import type { ReactNode } from 'react'

export type AuthCardProps = {
  /** Heading, e.g. "Club login", "Sign in" */
  title: ReactNode
  /** Recovery screens omit the brand and may put a back action before the heading. */
  showBrand?: boolean
  back?: ReactNode
  /** Status chip before the heading, used by the Admin access-denied card. */
  badge?: ReactNode
  /** Line under the ROTRA mark: "Run the game." (Queue), "Your player profile." (Player) */
  tagline?: ReactNode
  /** Product label beside the mark, as Admin shows "ADMIN" */
  product?: string
  /** Muted paragraph under the title */
  description?: ReactNode
  /** Shows "Signing in needs an internet connection." above the form */
  offline?: boolean
  /**
   * Context notice above the sign-in options, e.g. a Notice "Sign in to join <club>." when the player
   * came from an invite (P-LOGIN). Opt-in; nothing renders when omitted.
   */
  contextNotice?: ReactNode
  /**
   * The Google button (GoogleButton) shown above the form. When set, the divider
   * ("Signed up with a password?" by default) separates it from the form. Opt-in.
   */
  google?: ReactNode
  /** Divider text between the Google button and the form; only used with google */
  googleDivider?: ReactNode
  /** The app's sign-in form */
  children: ReactNode
  /** Muted note under the form */
  footer?: ReactNode
  /** Small line under the card, outside it, such as P-LOGIN's Terms of Service and Privacy Policy note */
  below?: ReactNode
  /**
   * Full-bleed background art (public path). Identical in both themes; the card keeps the theme surface.
   * 900 px and wider: the art fills the page, subject left, card right over a dark fade and a deeper
   * shadow. Phones: the art is darkened behind the centred card. Defaults to the art of an enclosing
   * AuthArtProvider; opt-in, nothing changes without it.
   */
  art?: string
}

/**
 * The prototypes' .login: the ROTRA mark and a centered card holding an app's sign-in form. The form
 * itself (fields, errors, submit) belongs to each product.
 */
export function AuthCard({
  title,
  showBrand = true,
  back,
  badge,
  tagline,
  product,
  description,
  offline,
  contextNotice,
  google,
  googleDivider = 'Signed up with a password?',
  children,
  footer,
  below,
  art: artProp,
}: AuthCardProps) {
  const contextArt = useAuthArt()
  const art = artProp ?? contextArt
  const card = (
    <Card
      className={cn(
        'flex w-[min(420px,100%)] flex-col gap-[18px] p-7',
        art && 'shadow-[0_24px_60px_color-mix(in_srgb,var(--color-share-bg)_50%,transparent)]',
      )}
    >
      {back}
      {showBrand ? (
        product ? (
          <div className="flex items-center gap-2.5" role="img" aria-label={`ROTRA ${product}`}>
            <RotraLogo className="h-[52px]" />
            <span className="text-[15px] font-bold tracking-[0.5px] text-fg2 uppercase">
              {product}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <RotraLogo className="h-[52px]" />
            </div>
            {tagline ? <p className="m-0 text-fg2">{tagline}</p> : null}
          </div>
        )
      ) : null}
      {badge ? <div>{badge}</div> : null}
      <div className="flex flex-col gap-1.5">
        <h1 className={product ? undefined : 'text-[22px]'}>{title}</h1>
        {description ? <p className="m-0 text-fg2">{description}</p> : null}
      </div>
      {offline ? <Notice tone="offline">Signing in needs an internet connection.</Notice> : null}
      {contextNotice}
      {google ? (
        <>
          {google}
          <div className="flex items-center gap-3 text-xs font-semibold tracking-[0.5px] text-fg3 uppercase before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
            {googleDivider}
          </div>
        </>
      ) : null}
      {children}
      {footer ? <p className="m-0 text-[13px] text-fg2">{footer}</p> : null}
    </Card>
  )
  // The prototypes' .login / .login::before. The fade and darkening use the fixed share-bg colour
  // (never overridden by light mode), so the art reads the same in both themes.
  const artClasses =
    "relative isolate overflow-hidden bg-share-bg bg-cover bg-[position:22%_center] bg-no-repeat before:absolute before:inset-0 before:-z-10 before:content-[''] before:bg-[linear-gradient(90deg,color-mix(in_srgb,var(--color-share-bg)_0%,transparent)_25%,color-mix(in_srgb,var(--color-share-bg)_55%,transparent)_60%,color-mix(in_srgb,var(--color-share-bg)_80%,transparent))] max-[899px]:before:bg-[color-mix(in_srgb,var(--color-share-bg)_60%,transparent)] min-[900px]:justify-items-end min-[900px]:pr-[max(7vw,48px)] min-[900px]:pl-12"
  return (
    <main
      className={cn(
        'grid min-h-[calc(100dvh-80px)] place-items-center py-6 pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))]',
        art && artClasses,
      )}
      style={art ? { backgroundImage: `url(${art})` } : undefined}
    >
      {below ? (
        <div className="flex w-[min(420px,100%)] flex-col gap-3">
          {card}
          <div className="text-center text-[13px] text-fg2">{below}</div>
        </div>
      ) : (
        card
      )}
    </main>
  )
}
