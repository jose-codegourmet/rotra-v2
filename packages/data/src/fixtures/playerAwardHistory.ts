import type { PlayerAwardHistory } from '../session-result/sessionResult.types'
import { clubPlayers } from './players'

/**
 * Per club player award history, copied from the prototype's seedPlayers() `prior` / `base` columns
 * for p1–p20 (in clubPlayers order): prior completed sessions at the demo club and the baseline win
 * rate they give. A null baseline means Most Improved and Off Day never consider that player.
 */
const PROTOTYPE_PRIOR_AND_BASE: readonly [prior: number, base: number | null][] = [
  [6, 0.62], // p1 Jose
  [7, 0.55], // p2 Aaron
  [5, 0.48], // p3 Raymark
  [8, 0.51], // p4 Mikee Abellana
  [6, 0.66], // p5 Gab
  [2, null], // p6 Dexter
  [5, 0.58], // p7 Dalton
  [1, null], // p8 Joeriz (guest)
  [6, 0.33], // p9 Albion
  [5, 0.45], // p10 Vince
  [9, 0.6], // p11 Karl
  [3, null], // p12 Klod (guest)
  [5, 0.5], // p13 Jasper
  [4, null], // p14 Emji
  [0, null], // p15 Russel (guest)
  [6, 0.72], // p16 Santino
  [1, null], // p17 Andrew
  [5, 0.4], // p18 Derrick
  [6, 0.5], // p19 Nathan (guest)
  [0, null], // p20 Trixie
]

export const playerAwardHistory: PlayerAwardHistory[] = PROTOTYPE_PRIOR_AND_BASE.map(
  ([priorSessions, baselineWinRate], i) => {
    const player = clubPlayers[i]
    if (!player) throw new Error('Award history references a missing club player.')
    return { clubPlayerId: player.id, priorSessions, baselineWinRate }
  },
)
