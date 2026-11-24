'use client'
import { useMockMutation } from '../mock/query'
import { saveExemptionList } from './exemption.mutations'
export function useSaveExemptionList() {
  return useMockMutation(saveExemptionList)
}
