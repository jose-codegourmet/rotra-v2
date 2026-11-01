'use client'
import { useMockMutation } from '../mock/query'
import { openAllCourtsEarly } from './courts'
export function useOpenAllCourtsEarly() {
  return useMockMutation(openAllCourtsEarly)
}
