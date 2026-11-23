import { cn } from '@rotra/ui/cn'

export type PlayerNameBlockProps = {
  /** The player's full name: always the fallback and the screen-reader name */
  fullName: string
  /** The player's own nickname */
  nickname?: string | null
  /** The club nickname (registered players only) */
  clubNickname?: string | null
  className?: string
}

/**
 * The club-facing name order (D-2026-11-18-03): club nickname, then nickname, then full name.
 * Returns the first present name and the others in that order, with repeats dropped.
 */
export function playerNameParts({ fullName, nickname, clubNickname }: PlayerNameBlockProps) {
  const seen = new Set<string>()
  const names = [clubNickname, nickname, fullName]
    .map((value) => value?.trim() ?? '')
    .filter((value) => {
      if (!value || seen.has(value.toLowerCase())) return false
      seen.add(value.toLowerCase())
      return true
    })
  return { first: names[0] ?? fullName, rest: names.slice(1) }
}

/**
 * The shared player name block for club-facing lists (the prototype's `nameB()`): the first present
 * name in bold, the others in one muted line joined with " · " (Migo, then "Migs · Miguel Santos").
 * Public pages keep their own masking rule and do not use it.
 */
export function PlayerNameBlock({ className, ...names }: PlayerNameBlockProps) {
  const { first, rest } = playerNameParts(names)
  return (
    <span className={cn('flex min-w-0 flex-col', className)}>
      <b className="font-semibold [overflow-wrap:anywhere]">{first}</b>
      {rest.length ? (
        <span className="text-xs text-fg2 [overflow-wrap:anywhere]">{rest.join(' · ')}</span>
      ) : null}
    </span>
  )
}
