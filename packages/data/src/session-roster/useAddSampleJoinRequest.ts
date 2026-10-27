'use client'
import { useMockMutation } from '../mock/query'
import { addSampleJoinRequest } from './mutations'
export function useAddSampleJoinRequest() {
  return useMockMutation(addSampleJoinRequest)
}
