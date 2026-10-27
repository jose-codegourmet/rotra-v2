'use client'
import { useMockMutation } from '../mock/query'
import { removeCourt } from './courts'
export function useRemoveCourt() {
  return useMockMutation(removeCourt)
}
