'use client'
import { useMockMutation } from '../mock/query'
import { changeClubPassword } from './settings'
export function useChangeClubPassword() {
  return useMockMutation(changeClubPassword)
}
