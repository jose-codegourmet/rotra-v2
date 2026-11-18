'use client'
import { useMockMutation } from '../mock/query'
import { setClubNickname } from './setClubNickname'

/** Saved players › profile › Club nickname › Save nickname (set, change or clear). */
export function useSetClubNickname() {
  return useMockMutation(setClubNickname)
}
