'use client'
import { useMockMutation } from '../mock/query'
import { submitJoinRequest } from './mutations'
export function useSubmitJoinRequest() {
  return useMockMutation(submitJoinRequest)
}
