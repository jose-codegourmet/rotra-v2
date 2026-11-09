'use client'
import { useMockMutation } from '../mock/query'
import { updateSelfCheckIn } from './settings'
export function useUpdateSelfCheckIn() {
  return useMockMutation(updateSelfCheckIn)
}
