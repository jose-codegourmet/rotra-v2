import type { MatchResultFormInput } from './MatchResultForm.schema'

/** The sheet opens with no winner picked and both score fields blank (the prototype's ACT.openResult). */
export const matchResultFormDefaultValues: MatchResultFormInput = {
  winner: null,
  scoreA: '',
  scoreB: '',
}

/** "Mikee", "Mikee and Dexter", "Mikee, Dexter and Gab": the prototype's listNames(). */
export function listNames(names: string[]): string {
  return names.length < 3
    ? names.join(' and ')
    : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}
