import type { MatchFormat, MatchLineup } from '@rotra/data/match/types'
import {
  MATCH_FORMAT_TEAM_SIZES,
  type MatchLineupFormInput,
  type SlotValues,
} from './MatchLineupForm.schema'

export type EnabledFormats = {
  singles: boolean
  doubles: boolean
}

/** The formats the editor offers: the enabled standard formats, then every fun format. */
export function offeredFormats(enabled: EnabledFormats): MatchFormat[] {
  return [
    ...(enabled.singles ? (['singles'] as const) : []),
    ...(enabled.doubles ? (['doubles'] as const) : []),
    'fun_1v2',
    'fun_3v3',
    'fun_4v4',
    'fun_5v5',
  ]
}

/** The editor opens on Doubles if on, else Singles, else 3v3 (the prototype's ACT.openEditor). */
export function openingFormat(enabled: EnabledFormats): MatchFormat {
  return enabled.doubles ? 'doubles' : enabled.singles ? 'singles' : 'fun_3v3'
}

/** Pads or trims one team's slots to the format's size, keeping the players already placed. */
export function sizeSlots(slots: SlotValues, size: number): SlotValues {
  return Array.from({ length: size }, (_, i) => slots[i] ?? null)
}

/** The slots a format needs, filled from a lineup (Edit lineup) or empty (Add match). */
export function slotsFor(format: MatchFormat, lineup?: Pick<MatchLineup, 'teamA' | 'teamB'>) {
  const [sizeA, sizeB] = MATCH_FORMAT_TEAM_SIZES[format]
  return {
    teamA: sizeSlots(lineup?.teamA ?? [], sizeA),
    teamB: sizeSlots(lineup?.teamB ?? [], sizeB),
  }
}

/** Add match: the opening format with empty slots. Edit lineup: the match's format and players. */
export function matchLineupFormDefaultValues(
  enabled: EnabledFormats,
  lineup?: MatchLineup,
): MatchLineupFormInput {
  const format = lineup?.format ?? openingFormat(enabled)
  return { format, ...slotsFor(format, lineup) }
}
