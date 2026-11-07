'use client'
import { useMockMutation } from '../mock/query'
import { updateClubPlayerDetails } from './details'
export function useUpdateClubPlayerDetails() {
  return useMockMutation(updateClubPlayerDetails)
}
