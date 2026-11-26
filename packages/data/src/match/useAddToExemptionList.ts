'use client'
import { useMockMutation } from '../mock/query'
import { addToExemptionList } from './exemption.mutations'
export function useAddToExemptionList() {
  return useMockMutation(addToExemptionList)
}
