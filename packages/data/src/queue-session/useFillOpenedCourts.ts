'use client'
import { useMockMutation } from '../mock/query'
import { fillOpenedCourts } from './courtFill'
/** Auto Queue for courts that just reached their planned opening time (console refresh). */
export function useFillOpenedCourts() {
  return useMockMutation(fillOpenedCourts)
}
