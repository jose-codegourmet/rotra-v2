import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import type { ReactNode } from 'react'

export type ResultSlideClub = {
  name: string
  logoUrl?: string | null
  /** Shown when there is no logo, e.g. "LS" */
  initials: string
}

export type ResultSlideFrameProps = {
  club: ResultSlideClub
  /** "Standings", "Awards" or "Off Day" */
  title: string
  /** "session title · date", e.g. "Thursday Open Play · Thu, Oct 23" */
  sessionLine: string
  venue: string
  children: ReactNode
  className?: string
}

/**
 * The prototype's .slide: the frame every result slide shares. Club logo or initials, the club
 * name, the slide title, the session line, the slide content, and a footer with the venue and
 * "powered by rotra". Read-only; the same frame is the visual reference for image exports.
 */
export function ResultSlideFrame({
  club,
  title,
  sessionLine,
  venue,
  children,
  className,
}: ResultSlideFrameProps) {
  return (
    <article
      aria-label={`${title} slide`}
      className={cn(
        'mx-auto flex w-full max-w-[560px] min-w-0 flex-col gap-4 rounded-[18px] border border-border-strong p-[22px]',
        'bg-[radial-gradient(120%_80%_at_100%_0%,var(--accent-subtle),transparent_60%)] bg-bg',
        className,
      )}
    >
      <header className="flex min-w-0 items-center gap-3">
        <Avatar
          name={club.name}
          initials={club.initials}
          src={club.logoUrl ?? undefined}
          size={52}
          shape="square"
          tone="accent"
        />
        <div className="min-w-0">
          <span className="block text-xs font-semibold tracking-[0.5px] text-fg2 uppercase [overflow-wrap:anywhere]">
            {club.name}
          </span>
          <h2>{title}</h2>
          <p className="text-[13px] text-fg2 [overflow-wrap:anywhere]">{sessionLine}</p>
        </div>
      </header>
      {children}
      <footer className="flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-fg2">
        <span className="min-w-0 [overflow-wrap:anywhere]">{venue}</span>
        <b className="flex-none font-bold tracking-[0.5px] text-accent">powered by rotra</b>
      </footer>
    </article>
  )
}
