import { Card } from '@rotra/ui/card'
import { Notice } from '@rotra/ui/notice'
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
  /** The app's sign-in form */
  children: ReactNode
  /** Muted note under the form */
  footer?: ReactNode
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
  children,
  footer,
}: AuthCardProps) {
  return (
    <main className="grid min-h-[calc(100dvh-80px)] place-items-center py-6 pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))]">
      <Card className="flex w-[min(420px,100%)] flex-col gap-[18px] p-7">
        {back}
        {showBrand ? (
          product ? (
            <div className="flex items-baseline gap-2.5" role="img" aria-label={`ROTRA ${product}`}>
              <span className="text-4xl leading-none font-extrabold tracking-[6px]">
                ROTR<b className="text-accent">A</b>
              </span>
              <span className="text-[15px] font-bold tracking-[0.5px] text-fg2 uppercase">
                {product}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div
                role="img"
                aria-label="ROTRA"
                className="text-[40px] leading-none font-extrabold tracking-[6px]"
              >
                ROTR<b className="text-accent">A</b>
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
        {children}
        {footer ? <p className="m-0 text-[13px] text-fg2">{footer}</p> : null}
      </Card>
    </main>
  )
}
