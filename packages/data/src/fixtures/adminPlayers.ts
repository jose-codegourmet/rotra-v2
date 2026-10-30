import type { PlayerRankStatus, SameNameGroup } from '../admin-player/adminPlayer.types'
import type { Player } from '../player/player.types'
import { playerProfileScenarios } from './playerProfiles'
import { clubPlayers, players } from './players'

function playerById(id: string): Player {
  const player = players.find((entry) => entry.id === id)
  if (!player) throw new Error('An Admin player fixture references a missing player.')
  return player
}

const jose = playerById('2c7f6a7b-eed9-5051-9426-6dbce5133fbc')
const albion = playerById('85ae7866-ff62-59fc-8af8-985a594bb5b2')
const mariaSteph = playerById('be7c6b86-6867-5c70-b067-54c97d70c598')
const mariaStephNickname = clubPlayers.find((entry) => entry.playerId === mariaSteph.id)?.nickname
if (!mariaStephNickname) throw new Error('Missing Maria Steph club nickname.')
const longNames = playerProfileScenarios.longNames

/**
 * Story-only variants of real players for the Admin Players row and the duplicate-name notices. The
 * demo pool has no shared names and keeps nicknames on club players only, so the second Albion
 * (the prototype's p9b Carlo Medina twin, RTR-PH-MNL-090226-0102) is not in players or the mock store.
 */
export const adminPlayerScenarios = {
  /** RTR-PH-CEB-031526-0001 */
  jose,
  nicknamed: { ...mariaSteph, nickname: mariaStephNickname },
  longNames: {
    ...playerById(longNames.playerId),
    fullName: longNames.fullName,
    nickname: longNames.nickname,
  },
  sameName: [albion, { ...albion, id: 'story-same-name', rtrId: 'RTR-PH-MNL-090226-0102' }],
} satisfies Record<string, Player | Player[]>

/** The duplicate-name lines a search can return: one name, then two. */
export const sameNameGroupExamples = {
  one: [{ name: albion.fullName, count: 2 }],
  two: [
    { name: albion.fullName, count: 2 },
    { name: longNames.fullName, count: 3 },
  ],
} satisfies Record<string, SameNameGroup[]>

/** One of each Admin rank status, for stories. */
export const rankStatusExamples = {
  none: { kind: 'none' },
  below: { kind: 'below' },
  board: { kind: 'board' },
} satisfies Record<PlayerRankStatus['kind'], PlayerRankStatus>
