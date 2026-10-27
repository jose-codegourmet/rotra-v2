import type { MatchFormat, MatchLineup } from '@rotra/data/match/types'
import { z } from 'zod'

export const FILL_SLOTS_ERROR = 'Fill every slot. Team sizes are fixed by the format.'
export const DUPLICATE_PLAYER_ERROR = 'Each player can only take one slot in a match.'

/** Every format in the order the editor offers them: standard formats first, then the fun ones. */
export const MATCH_FORMATS = [
  'singles',
  'doubles',
  'fun_1v2',
  'fun_3v3',
  'fun_4v4',
  'fun_5v5',
] as const satisfies readonly MatchFormat[]

/** Mirrors FORMAT_TEAM_SIZES in @rotra/data/match/match.rules (a UI component may only import types). */
export const MATCH_FORMAT_TEAM_SIZES: Record<MatchFormat, readonly [number, number]> = {
  singles: [1, 1],
  doubles: [2, 2],
  fun_1v2: [1, 2],
  fun_3v3: [3, 3],
  fun_4v4: [4, 4],
  fun_5v5: [5, 5],
}

/** Mirrors FORMAT_LABELS in @rotra/data/match/match.rules. */
export const MATCH_FORMAT_LABELS: Record<MatchFormat, string> = {
  singles: 'Singles',
  doubles: 'Doubles',
  fun_1v2: '1v2 fun',
  fun_3v3: '3v3 fun',
  fun_4v4: '4v4 fun',
  fun_5v5: '5v5 fun',
}

export const isFunFormat = (format: MatchFormat) => format.startsWith('fun_')

/** The slots of one team while editing: a SessionPlayer id, or null for "+ Choose player". */
export type SlotValues = (string | null)[]

/**
 * Q-MANUAL: a format and its Team A / Team B slots. Every slot must hold a player (team sizes are
 * fixed by the format) and no player may take two slots. Both errors sit on `teamA`, which the form
 * shows once under the slot columns and marks the offending slots.
 */
export const matchLineupSchema = z
  .object({
    format: z.enum(MATCH_FORMATS),
    teamA: z.array(z.string().nullable()),
    teamB: z.array(z.string().nullable()),
  })
  .superRefine((values, ctx) => {
    const [sizeA, sizeB] = MATCH_FORMAT_TEAM_SIZES[values.format]
    const teamA = values.teamA.slice(0, sizeA)
    const teamB = values.teamB.slice(0, sizeB)
    const filled = [...teamA, ...teamB].filter((id): id is string => !!id)
    if (teamA.length !== sizeA || teamB.length !== sizeB || filled.length !== sizeA + sizeB) {
      ctx.addIssue({ code: 'custom', message: FILL_SLOTS_ERROR, path: ['teamA'] })
      return
    }
    if (new Set(filled).size !== filled.length) {
      ctx.addIssue({ code: 'custom', message: DUPLICATE_PLAYER_ERROR, path: ['teamA'] })
    }
  })
  .transform((values): MatchLineup => {
    const [sizeA, sizeB] = MATCH_FORMAT_TEAM_SIZES[values.format]
    return {
      format: values.format,
      teamA: values.teamA.slice(0, sizeA).filter((id): id is string => !!id),
      teamB: values.teamB.slice(0, sizeB).filter((id): id is string => !!id),
    }
  })

/** What the fields hold while editing: null slots are still empty */
export type MatchLineupFormInput = z.input<typeof matchLineupSchema>
/** What onSubmit receives: a complete MatchLineup, as useAddMatch and useUpdateMatchLineup take */
export type MatchLineupFormValues = z.output<typeof matchLineupSchema>
