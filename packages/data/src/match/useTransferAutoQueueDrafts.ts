'use client'
import { useMockMutation } from '../mock/query'
import { transferAutoQueueDrafts } from './autoQueue.mutations'
export function useTransferAutoQueueDrafts() {
  return useMockMutation(transferAutoQueueDrafts)
}
