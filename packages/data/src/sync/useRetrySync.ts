'use client'
import { useMockMutation } from '../mock/query'
import { retrySync } from './fetchers'
export function useRetrySync() {
  return useMockMutation(retrySync)
}
