'use client'
import { useMockMutation } from '../mock/query'
import { moveCourt } from './control'
export function useMoveCourt() {
  return useMockMutation(moveCourt)
}
