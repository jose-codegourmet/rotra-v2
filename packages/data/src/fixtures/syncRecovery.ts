export const pendingSyncChanges = [
  { id: 'sync-presence', area: 'Roster', text: 'Miguel Santos marked present', at: Date.UTC(2026, 9, 28, 11, 30) },
  { id: 'sync-result', area: 'Matches and results', text: 'Match 12 result recorded', at: Date.UTC(2026, 9, 28, 11, 42) },
  { id: 'sync-payment', area: 'Payments', text: 'Bea Castillo paid ₱900', at: Date.UTC(2026, 9, 28, 11, 44) },
]
export const syncedChangesFixture = [{ id: 'sync-start', area: 'Session', text: 'Session started · levels locked', at: Date.UTC(2026, 9, 28, 11) }]
export const missingRecordsFixture = [{ label: 'Original device records', detail: 'Some matches and results recorded on Device 1 have not arrived on this device.' }]
export const longMissingRecordsFixture = [...missingRecordsFixture, { label: 'Latest queue and presence changes', detail: 'Changes made after the latest snapshot on this device may be missing. Ask the original device to reconnect before Session done.' }]
