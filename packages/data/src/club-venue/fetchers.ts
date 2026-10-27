import { moneyField } from '@rotra/schema/money'
import { nameField } from '@rotra/schema/name'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { readMockState } from '../mock/store'
import { queueMutation, requireClubAccess } from '../mock/transaction'
import type { ClubVenue } from './clubVenue.types'
export async function getClubVenues() {
  await delay()
  requireClubAccess()
  const state = readMockState()
  return state.venues
    .filter((v) => v.clubId === DEMO_CLUB_ID)
    .map((v) => {
      const sessions = state.sessions.filter((s) => s.venueId === v.id)
      return {
        ...v,
        sessionsHere: sessions.length,
        nextSession:
          sessions
            .filter((s) => s.state === 'prepared' && s.scheduledStartAt > Date.now())
            .sort((a, b) => a.scheduledStartAt - b.scheduledStartAt)[0] ?? null,
      }
    })
}
export function saveClubVenue(
  input: Omit<ClubVenue, 'id' | 'clubId' | 'currency'> & { id?: string },
) {
  return queueMutation({ area: 'Session setup', onlineOnly: true, clubAccess: true }, (state) => {
    const name = nameField.parse(input.name)
    if (
      state.venues.some(
        (v) =>
          v.clubId === DEMO_CLUB_ID &&
          v.id !== input.id &&
          v.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    )
      throw new MockError('conflict', 'You already have a venue with this name.', {
        name: 'You already have a venue with this name.',
      })
    const existing = input.id
      ? state.venues.find((v) => v.id === input.id && v.clubId === DEMO_CLUB_ID)
      : undefined
    if (input.id && !existing) throw new MockError('permission', 'Venue not available.')
    const venue: ClubVenue = {
      id: existing?.id ?? crypto.randomUUID(),
      clubId: DEMO_CLUB_ID,
      name,
      address: input.address.trim(),
      courtFeeMinor: input.courtFeeMinor === null ? null : moneyField.parse(input.courtFeeMinor),
      entranceFeeMinor:
        input.entranceFeeMinor === null ? null : moneyField.parse(input.entranceFeeMinor),
      currency: 'PHP',
    }
    if (existing) Object.assign(existing, venue)
    else state.venues.push(venue)
    return { data: venue, text: existing ? 'Venue updated' : `${name} added to your venues` }
  })
}
export function venuePrefill(venueId: string) {
  const venue = readMockState().venues.find((v) => v.id === venueId && v.clubId === DEMO_CLUB_ID)
  return venue ? { venueId: venue.id, name: venue.name, address: venue.address } : null
}
