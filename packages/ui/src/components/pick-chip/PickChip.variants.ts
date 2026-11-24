// The Player prototype's .ob-chip: a 40 px pill that shows a check once picked. Radix radio items and
// plain checkbox buttons both set aria-checked, so one class string serves both.
export const pickChipClass = [
  'group inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3.5 font-semibold text-fg',
  'aria-checked:border-accent aria-checked:bg-accent-subtle',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
  'disabled:cursor-not-allowed disabled:opacity-45 touch:min-h-11',
].join(' ')
