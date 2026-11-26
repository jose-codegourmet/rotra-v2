import { cn } from '@rotra/ui/cn'

export type PlayerNameBlockProps = {
  /** The player's full name: always the fallback and the screen-reader name */
  fullName: string
  /** The player's own nickname */
  nickname?: string | null
  /** The club nickname (registered players only) */
  clubNickname?: string | null
  /**
   * inline (default): the bold label and one muted line joined with " · " (the prototype's nameB).
   * stack: the label and each other name on its own smaller line (nameStack, subNames).
   * face: for a picture's caption; with no nicknames the label is the first name and the full name
   * sits under it (faceNames).
   */
  layout?: 'inline' | 'stack' | 'face'
  /** Face layout: photo = on a court drawing (dark pill lines, hidden on a narrow court), plain = on a queue card */
  tone?: 'photo' | 'plain'
  /** Stack and face: classes for the label (size, weight, colour) */
  labelClassName?: string
  /** Stack: size of the smaller lines; defaults to 11 px */
  lineClassName?: string
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
 * The names a face shows (prototype `faceNames`): with a club nickname or nickname the label is the
 * first present name; with neither it is the first name and the full name goes in the line under it.
 */
export function playerFaceNameParts(names: PlayerNameBlockProps) {
  const { first, rest } = playerNameParts(names)
  if (rest.length) return { label: first, lines: rest }
  const firstName = names.fullName.trim().split(/\s+/)[0] || names.fullName
  return { label: firstName, lines: firstName === first ? [] : [first] }
}

const LINE_TONE = ['text-fg2 font-semibold', 'text-fg3 font-medium'] as const

/**
 * The shared player name block for club-facing lists. Inline (the prototype's `nameB()`): the first
 * present name in bold, the others in one muted line joined with " · " (Migo, then "Migs · Miguel
 * Santos"). Stack (`nameStack`, `subNames`): each other name on its own smaller line, the second
 * `fg2` and the third `fg3`, one line each with an ellipsis. Face (`faceNames`): a picture's caption.
 * Public pages keep their own masking rule and do not use it.
 */
export function PlayerNameBlock({
  className,
  layout = 'inline',
  tone = 'plain',
  labelClassName,
  lineClassName,
  ...names
}: PlayerNameBlockProps) {
  if (layout === 'inline') {
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
  const face = layout === 'face'
  const { label, lines } = face ? playerFaceNameParts(names) : stackParts(names)
  return (
    <span
      data-slot="face-name"
      className={cn('flex min-w-0 max-w-full flex-col', face && 'items-center', className)}
    >
      <span className={cn('max-w-full truncate', !face && 'font-bold', labelClassName)}>
        {label}
      </span>
      {lines.map((line, i) => (
        <span
          key={line}
          data-slot="name-line"
          className={cn(
            'block max-w-full truncate leading-[1.25]',
            face && tone === 'photo'
              ? 'mt-px rounded-full bg-photo-label px-[5px] text-[9px] font-semibold text-on-photo/85 @max-[240px]:hidden'
              : cn(face ? 'text-[10px]' : 'text-[11px]', LINE_TONE[i === 0 ? 0 : 1]),
            lineClassName,
          )}
        >
          {line}
        </span>
      ))}
    </span>
  )
}

function stackParts(names: PlayerNameBlockProps) {
  const { first, rest } = playerNameParts(names)
  return { label: first, lines: rest }
}
