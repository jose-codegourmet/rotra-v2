'use client'
import { useMockMutation } from '../mock/query'
import { tradeCourts } from './control'
export function useTradeCourts() {
  return useMockMutation(tradeCourts)
}
