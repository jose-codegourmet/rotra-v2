'use client'
import { useMockMutation } from '../mock/query'
import { requestClubNameChange } from './settings'
export function useRequestClubNameChange() {
  return useMockMutation(requestClubNameChange)
}
