'use client'
import { useMockMutation } from '../mock/query'
import { saveInventoryItem } from './fetchers'
export function useSaveInventoryItem() {
  return useMockMutation(saveInventoryItem)
}
