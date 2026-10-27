'use client'
import { useMockMutation } from '../mock/query'
import { createQueueSession } from './mutations'
export function useCreateQueueSession() {
  return useMockMutation(createQueueSession)
}
