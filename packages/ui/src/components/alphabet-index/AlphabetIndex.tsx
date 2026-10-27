const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#']

export type AlphabetIndexProps = {
  /** Letters that have players; the others are disabled */
  available: string[]
  onJump: (letter: string) => void
}

/** The prototype's .az: a sticky A–Z and # rail on the right of Saved players. */
export function AlphabetIndex({ available, onJump }: AlphabetIndexProps) {
  const has = new Set(available)
  return (
    <nav
      aria-label="Jump to letter"
      className="sticky top-[calc(70px+env(safe-area-inset-top,0px))] flex flex-col items-center gap-px rounded-full border border-border bg-surface px-0.5 py-1.5"
    >
      {LETTERS.map((letter) => (
        <button
          key={letter}
          type="button"
          disabled={!has.has(letter)}
          onClick={() => onJump(letter)}
          aria-label={`Jump to ${letter === '#' ? 'other names' : letter}`}
          className="h-[22px] w-[26px] rounded-[6px] border-0 bg-transparent p-0 text-[11px] font-extrabold text-accent hover:not-disabled:bg-accent-subtle disabled:cursor-default disabled:font-semibold disabled:text-fg3 [@media(max-height:700px)]:h-[17px] [@media(max-height:700px)]:text-[10px]"
        >
          {letter}
        </button>
      ))}
    </nav>
  )
}
