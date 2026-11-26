/**
 * Handicap · tonight (D-2026-11-25-03): where the Queue Master marked a player's handicap tonight.
 * Session only, Queue Master only. Any spot shortens the games-in-a-row limit in Generate matches
 * (Match making factors, D-2026-11-25-01). Codes match `session_players.handicap_spots`.
 */
export const HANDICAP_SPOTS = [
  { code: 'left_shoulder', label: 'Left shoulder' },
  { code: 'right_shoulder', label: 'Right shoulder' },
  { code: 'left_elbow', label: 'Left elbow' },
  { code: 'right_elbow', label: 'Right elbow' },
  { code: 'left_wrist', label: 'Left wrist' },
  { code: 'right_wrist', label: 'Right wrist' },
  { code: 'lower_back', label: 'Lower back' },
  { code: 'left_knee', label: 'Left knee' },
  { code: 'right_knee', label: 'Right knee' },
  { code: 'left_ankle', label: 'Left ankle' },
  { code: 'right_ankle', label: 'Right ankle' },
] as const

export type HandicapSpot = (typeof HANDICAP_SPOTS)[number]['code']

export const isHandicapSpot = (value: unknown): value is HandicapSpot =>
  HANDICAP_SPOTS.some((s) => s.code === value)

/** Known spots only, each once, in figure order (the order chips and the card title use). */
export const handicapSpotsOf = (values: readonly unknown[] | null | undefined): HandicapSpot[] =>
  HANDICAP_SPOTS.map((s) => s.code).filter((code) => values?.includes(code))

export const handicapLabel = (spot: HandicapSpot) =>
  HANDICAP_SPOTS.find((s) => s.code === spot)?.label ?? spot

/** The Players card icon's title and accessible name: "Handicap: left knee, lower back". */
export const handicapText = (spots: readonly HandicapSpot[]) =>
  `Handicap: ${handicapSpotsOf(spots)
    .map((s) => handicapLabel(s).toLowerCase())
    .join(', ')}`

/** Two spot lists hold the same spots (order ignored). */
export const sameHandicap = (a: readonly HandicapSpot[], b: readonly HandicapSpot[]) =>
  handicapSpotsOf(a).join() === handicapSpotsOf(b).join()
