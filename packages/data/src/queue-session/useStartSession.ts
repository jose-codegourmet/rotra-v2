'use client'
import { useMockMutation } from '../mock/query'
import { startSession } from './mutations'
export function useStartSession() {
  return useMockMutation(startSession)
}
