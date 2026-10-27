'use client'
import { useMockMutation } from '../mock/query'
import { updateQueueSession } from './mutations'
export function useUpdateQueueSession() {
  return useMockMutation(updateQueueSession)
}
