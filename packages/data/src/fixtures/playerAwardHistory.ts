import type { PlayerAwardHistory } from '../session-result/sessionResult.types'
import { clubPlayers } from './players'

/**
 * Per club player award history, copied from the prototype's seedPlayers() `prior` / `base` columns
 * for p1–p20 (in clubPlayers order): prior completed sessions at the demo club and the baseline win
 * rate they give. A null baseline means Most Improved and Off Day never consider that player.
 */
const PROTOTYPE_PRIOR_AND_BASE: readonly [prior: number, base: number | null][] = [
  [6, 0.62], // p1 Miguel Santos
  [7, 0.55], // p2 Bea Castillo
  [5, 0.48], // p3 Jomar dela Cruz
  [8, 0.51], // p4 Kat Lim
  [6, 0.66], // p5 Enzo Navarro
  [2, null], // p6 Joanna Tan
  [5, 0.58], // p7 Rafa Aquino
  [1, null], // p8 Lia Bautista (guest)
  [6, 0.33], // p9 Carlo Medina
  [5, 0.45], // p10 Nina Ocampo
  [9, 0.6], // p11 Paulo Garcia
  [3, null], // p12 Sam Villareal (guest)
  [5, 0.5], // p13 Dani Rivera
  [4, null], // p14 Theo Ramos
  [0, null], // p15 Ysa Fernandez (guest)
  [6, 0.72], // p16 Marco Lopez
  [1, null], // p17 Gab Torres
  [5, 0.4], // p18 Iya Mercado
  [6, 0.5], // p19 Kiko Salazar (guest)
  [0, null], // p20 Andi Cruz
]

export const playerAwardHistory: PlayerAwardHistory[] = PROTOTYPE_PRIOR_AND_BASE.map(
  ([priorSessions, baselineWinRate], i) => {
    const player = clubPlayers[i]
    if (!player) throw new Error('Award history references a missing club player.')
    return { clubPlayerId: player.id, priorSessions, baselineWinRate }
  },
)
