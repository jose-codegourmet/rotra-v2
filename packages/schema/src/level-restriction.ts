import { z } from 'zod'

/**
 * Session **Restrictions** (D-2026-11-19-12): which levels may take a slot, one pick per session.
 * `all` (the default) · `beginners` (beginners only) · `beginners-intermediate` (no advanced) ·
 * `per-level` (slots per level: a number of beginner, intermediate and advanced slots that add up
 * to the session's slots). A level's band decides.
 */
export const LEVEL_RESTRICTION_KINDS = [
  'all',
  'beginners',
  'beginners-intermediate',
  'per-level',
] as const
export type LevelRestrictionKind = (typeof LEVEL_RESTRICTION_KINDS)[number]

/** The three level bands, in order. */
export const LEVEL_BANDS = ['beginner', 'intermediate', 'advanced'] as const
export type LevelBand = (typeof LEVEL_BANDS)[number]
export type LevelSlots = Record<LevelBand, number>

/** `slots` is read only with `per-level`; the other picks carry none. */
export type LevelRestriction = { kind: LevelRestrictionKind; slots?: LevelSlots }

export const LEVEL_SLOTS_NUMBER_ERROR = 'Use whole numbers, 0 or more.'

/** One band's slot count: a whole number, 0 or more. */
export const levelSlotsField = z
  .number({ error: LEVEL_SLOTS_NUMBER_ERROR })
  .int(LEVEL_SLOTS_NUMBER_ERROR)
  .min(0, LEVEL_SLOTS_NUMBER_ERROR)

/**
 * The stored shape. The sum check needs the session's courts and players per court, so the form
 * adds it with `levelSlotsError`.
 */
export const levelRestrictionField = z.object({
  kind: z.enum(LEVEL_RESTRICTION_KINDS),
  slots: z
    .object({
      beginner: levelSlotsField,
      intermediate: levelSlotsField,
      advanced: levelSlotsField,
    })
    .optional(),
})

const slotCount = (slots: Partial<Record<LevelBand, unknown>> | undefined, band: LevelBand) =>
  Number(slots?.[band]) || 0

/**
 * The restriction a session reads as: the saved pick, or All levels when it is missing or unknown
 * (sessions saved before the setting). Only `per-level` keeps slot counts.
 */
export function levelRestrictionOf(value: unknown): LevelRestriction {
  const saved = value as { kind?: unknown; slots?: Partial<Record<LevelBand, unknown>> } | null
  const kind = LEVEL_RESTRICTION_KINDS.find((k) => k === saved?.kind) ?? 'all'
  if (kind !== 'per-level') return { kind }
  return {
    kind,
    slots: {
      beginner: slotCount(saved?.slots, 'beginner'),
      intermediate: slotCount(saved?.slots, 'intermediate'),
      advanced: slotCount(saved?.slots, 'advanced'),
    },
  }
}

/**
 * Slots per level must be whole numbers, 0 or more, that add up to the session's slots (courts ×
 * players per court) before saving. Null when the restriction can be saved; the other picks always
 * can.
 */
export function levelSlotsError(
  restriction: { kind: LevelRestrictionKind; slots?: Partial<Record<LevelBand, unknown>> },
  courts: number,
  playersPerCourt: number,
): string | null {
  if (restriction.kind !== 'per-level') return null
  const counts = LEVEL_BANDS.map((band) => slotCount(restriction.slots, band))
  if (counts.some((n) => !Number.isInteger(n) || n < 0)) return LEVEL_SLOTS_NUMBER_ERROR
  const sum = counts.reduce((total, n) => total + n, 0)
  const capacity = courts * playersPerCourt
  return sum === capacity
    ? null
    : `The slots add up to ${sum}; this session has ${capacity} (${courts} court${courts === 1 ? '' : 's'} × ${playersPerCourt}).`
}

/** The four picks with their names and one-line rules (the Restrictions choice cards, the Details tile). */
export const LEVEL_RESTRICTION_OPTIONS: readonly {
  kind: LevelRestrictionKind
  label: string
  text: string
}[] = [
  { kind: 'all', label: 'All levels', text: 'Any level can take a slot.' },
  { kind: 'beginners', label: 'Beginners only', text: 'Only beginner levels can take a slot.' },
  {
    kind: 'beginners-intermediate',
    label: 'Beginners to intermediate',
    text: 'Beginner and intermediate levels; no advanced.',
  },
  {
    kind: 'per-level',
    label: 'Slots per level',
    text: 'Set how many beginner, intermediate and advanced slots.',
  },
]

/**
 * The Levels row: the pick's label, or "6 beginner · 5 intermediate · 5 advanced" for slots per
 * level. A missing restriction reads as All levels.
 */
export function levelRestrictionLabel(value: unknown): string {
  const { kind, slots } = levelRestrictionOf(value)
  if (kind === 'per-level')
    return LEVEL_BANDS.map((band) => `${slots?.[band] ?? 0} ${band}`).join(' · ')
  return LEVEL_RESTRICTION_OPTIONS.find((o) => o.kind === kind)?.label ?? 'All levels'
}

/** The rule line under the Levels tile; none for All levels. */
export function levelRestrictionDescription(value: unknown): string | undefined {
  const { kind } = levelRestrictionOf(value)
  return kind === 'all' ? undefined : LEVEL_RESTRICTION_OPTIONS.find((o) => o.kind === kind)?.text
}
