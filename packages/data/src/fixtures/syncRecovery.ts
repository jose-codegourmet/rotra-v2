import type { SyncConflict } from '../sync/sync.types'
import { consoleSessionFixture } from './consoleSessions'
export const pendingSyncChanges = [
  { id: 'sync-presence', area: 'Roster', text: 'Miguel Santos marked present', at: Date.UTC(2026, 9, 28, 11, 30) },
  { id: 'sync-result', area: 'Matches and results', text: 'Match 12 result recorded', at: Date.UTC(2026, 9, 28, 11, 42) },
  { id: 'sync-payment', area: 'Payments', text: 'Bea Castillo paid ₱900', at: Date.UTC(2026, 9, 28, 11, 44) },
]
export const syncedChangesFixture = [{ id: 'sync-start', area: 'Session', text: 'Session started · levels locked', at: Date.UTC(2026, 9, 28, 11) }]
export const missingRecordsFixture = [{ label: 'Original device records', detail: 'Some matches and results recorded on Device 1 have not arrived on this device.' }]
export const longMissingRecordsFixture = [...missingRecordsFixture, { label: 'Latest queue and presence changes', detail: 'Changes made after the latest snapshot on this device may be missing. Ask the original device to reconnect before Session done.' }]

/** Illustrative conflicting device versions of the same console matches; no authority rule is implied. */
export const syncConflictsFixture: SyncConflict[] = consoleSessionFixture.matches.slice(0, 2).map((match, index) => {
 const player = (id: string) => {
  const p = consoleSessionFixture.roster.find((r) => r.id === id)!
  return { id: p.clubPlayerId, name: p.nameSnapshot, shortName: p.nicknameSnapshot ?? p.nameSnapshot.split(' ')[0] ?? p.nameSnapshot, level: p.level }
 }
 const teams = { teamA: match.teamA.map(player), teamB: match.teamB.map(player) }
 return { id: `sync-conflict-${index + 1}`, matchNumber: match.matchNo, courtLabel: consoleSessionFixture.courts[index]?.label ?? 'Court 1', versions: [{ ...teams, deviceLabel: 'Device 1', order: 12 + index, winner: 'A', score: { teamA: 21, teamB: 18 } }, { ...teams, deviceLabel: 'Device 2', order: 5 + index, winner: 'B', score: { teamA: 18, teamB: 21 } }] }
})
export const longSyncConflictFixture: SyncConflict = { ...syncConflictsFixture[0]!, versions: syncConflictsFixture[0]!.versions.map((v) => ({ ...v, teamA: v.teamA.map((p, index) => index ? p : { ...p, name: 'Maria Consolacion Dela Cruz Villareal', shortName: 'Maria Consolacion' }) })) }
