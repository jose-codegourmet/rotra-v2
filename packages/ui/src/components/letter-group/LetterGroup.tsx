import type { ReactNode } from 'react'

/** Heading id for a letter, so AlphabetIndex's onJump can focus it ("#" → "num"). */
export function letterHeadingId(letter: string) {
  return `letter-${letter === '#' ? 'num' : letter}`
}

export type LetterGroupProps = {
  /** "A"–"Z", or "#" for names that start with something else */
  letter: string
  count: number
  /** The cards in this group */
  children: ReactNode
}

/**
 * One letter's section in Saved players: a sticky letter heading with its count (focusable, so the A–Z
 * index can move focus to it) over a grid of cards, at least two across even on phones.
 */
export function LetterGroup({ letter, count, children }: LetterGroupProps) {
  const id = letterHeadingId(letter)
  return (
    <section aria-labelledby={id} className="scroll-mt-[calc(70px+env(safe-area-inset-top,0px))]">
      <h2
        id={id}
        tabIndex={-1}
        className="sticky top-[calc(56px+env(safe-area-inset-top,0px))] z-2 mb-2 flex items-baseline gap-2 border-b border-border bg-bg px-0.5 py-1.5 text-[22px] font-extrabold text-accent focus:outline-none"
      >
        {letter}
        <span className="text-[13px] font-normal text-fg2">{count}</span>
      </h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,140px),1fr))] gap-3">
        {children}
      </div>
    </section>
  )
}
