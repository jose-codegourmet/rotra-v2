'use client'
import { useMockMutation } from '../mock/query'
import { createPlayerInvite } from './fetchers'
export function useCreatePlayerInvite() {
  return useMockMutation(createPlayerInvite)
}
