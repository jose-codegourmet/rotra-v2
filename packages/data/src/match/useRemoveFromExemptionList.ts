'use client'
import { useMockMutation } from '../mock/query'
import { removeFromExemptionList } from './exemption.mutations'
export function useRemoveFromExemptionList() {
  return useMockMutation(removeFromExemptionList)
}
