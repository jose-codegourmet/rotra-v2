'use client'
import { useMockMutation } from '../mock/query'
import { saveClubVenue } from './fetchers'
export function useSaveClubVenue() {
  return useMockMutation(saveClubVenue)
}
