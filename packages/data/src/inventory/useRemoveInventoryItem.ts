'use client'
import { useMockMutation } from '../mock/query'
import { removeInventoryItem } from './fetchers'
export function useRemoveInventoryItem() {
  return useMockMutation(removeInventoryItem)
}
