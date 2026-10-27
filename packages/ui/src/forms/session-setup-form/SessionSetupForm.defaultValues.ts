import type { SessionSetupInput } from './SessionSetupForm.schema'

const pad = (n: number) => String(n).padStart(2, '0')

/** Tomorrow as YYYY-MM-DD, in local time */
export function tomorrowYmd(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** New-session defaults from the prototype's draftFrom(): tomorrow 19:00–22:00, two courts, Doubles, Fair. */
export function sessionSetupDefaultValues(playersPerCourt = 8): SessionSetupInput {
  return {
    title: '',
    date: tomorrowYmd(),
    startTime: '19:00',
    endTime: '22:00',
    venue: { venueId: '', name: '', address: '' },
    repeat: 'none',
    repeatCount: 4,
    courtLabels: ['Court 1', 'Court 2'],
    playersPerCourt,
    allowSingles: false,
    allowDoubles: true,
    sessionMode: 'fair',
    minimumIsCalculated: true,
    minimumGames: '4',
    expectedPlayers: '12',
    notes: '',
  }
}
