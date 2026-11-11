import { cn } from '@rotra/ui/cn'
import type { ReactNode } from 'react'

/** Heading id for a letter, so AlphabetIndex's onJump can focus it ("#" → "num"). */
export function letterHeadingId(letter: string) {
  return `letter-${letter === '#' ? 'num' : letter}`
}

export type LetterGroupProps = {
  /** "A"–"Z", or "#" for names that start with something else */
  letter: string
  count: number
  /**
   * `grid` (Queue › Saved players): cards at least two across. `list` (Player › club Members,
   * P-CLUB-MEMBERS): one card per letter holding stacked rows, the prototype's .sp-sec.
   */
  layout?: 'grid' | 'list'
  /** The cards (grid) or rows (list) in this group */
  children: ReactNode
}

/**
 * One letter's section: a sticky letter heading with its count (focusable, so the A–Z index can move
 * focus to it) over the group's cards or rows.
 */
export function LetterGroup({ letter, count, layout = 'grid', children }: LetterGroupProps) {
  const id = letterHeadingId(letter)
  const list = layout === 'list'
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'scroll-mt-[calc(70px+env(safe-area-inset-top,0px))]',
        list && 'min-w-0 rounded-lg border border-border bg-surface px-4 pb-1 shadow-card',
      )}
    >
      <h2
        id={id}
        tabIndex={-1}
        className={cn(
          'sticky top-[calc(56px+env(safe-area-inset-top,0px))] z-2 mb-2 flex items-baseline gap-2 border-b border-border px-0.5 py-1.5 text-[22px] font-extrabold text-accent focus:outline-none',
          list ? 'mb-1 bg-surface pt-2.5' : 'bg-bg',
        )}
      >
        {letter}
        <span className="text-[13px] font-normal text-fg2">{count}</span>
      </h2>
      {list ? (
        <div>{children}</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,140px),1fr))] gap-3">
          {children}
        </div>
      )}
    </section>
  )
}
