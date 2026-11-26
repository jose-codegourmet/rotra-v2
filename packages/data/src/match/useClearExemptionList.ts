'use client'
import { useMockMutation } from '../mock/query'
import { clearExemptionList } from './exemption.mutations'
export function useClearExemptionList() {
  return useMockMutation(clearExemptionList)
}
