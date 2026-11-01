import type { AdminPlayer } from '../admin-player/adminPlayer.types'
import type { MockState } from '../mock/store'

/** #336 authorizes management scenarios in addition to the shared demo pool. */
export function seedAdminPlayerManagement(state: MockState) {
  for (let i = 0; i < 80; i++) {
    const id = `admin-demo-${i}`,
      city = ['CEB', 'MNL', 'DVO'][i % 3]
    const fullName = i < 2 ? 'Alex Reyes' : `Demo Player ${String(i + 1).padStart(2, '0')}`
    const rtrId = `RTR-PH-${city}-10${String((i % 28) + 1).padStart(2, '0')}26-${String(i + 1000).padStart(4, '0')}`
    state.players.push({ id, fullName, nickname: null, rtrId })
    state.playerProfiles.push({
      playerId: id,
      fullName,
      nickname: null,
      rtrId,
      picture: null,
      playingStyle: '',
      experienceYears: null,
      experienceMonths: null,
      socialLinks: { facebook: '', instagram: '', youtube: '', linkedin: '' },
    })
    state.playerAccounts.push({
      playerId: id,
      phone: i < 2 ? '+639171234567' : '',
      email: i === 2 || i === 3 ? 'duplicate@example.com' : '',
      claimed: false,
      phoneHidden: false,
    })
    state.adminPlayerRecords[id] = {
      archivedAt: i === 79 ? '2026-10-31T00:00:00Z' : null,
      revision: 1,
      createdByClubId: null,
      adminCreated: true,
    }
    if (i === 0)
      for (const [j, club] of state.clubs.slice(0, 5).entries())
        state.clubPlayers.push({
          id: `admin-membership-${j}`,
          clubId: club.id,
          playerId: id,
          fullName,
          nickname: null,
          playingLevel: null,
          identity: j === 3 ? 'pending' : j === 4 ? 'guest' : 'unclaimed',
          addedAt: 1790812800000,
        })
  }
}
export const managementPlayer: AdminPlayer = {
  id: 'admin-demo-0',
  name: 'Alex Reyes',
  nickname: null,
  rtrId: 'RTR-PH-CEB-100126-1000',
  createdByClubId: null,
  createdOn: '2026-10-01',
  addedOn: '2026-10-01',
  claimed: false,
  phoneHidden: false,
  levelIndex: null,
  levelBand: null,
  recentStandardMatches: 0,
  rankStatus: { kind: 'none', text: 'No rank yet' },
  picture: null,
  registeredPlace: { code: 'CEB', name: 'Cebu City' },
  clubs: [],
  archivedAt: null,
  revision: 1,
  removalReason: null,
}
