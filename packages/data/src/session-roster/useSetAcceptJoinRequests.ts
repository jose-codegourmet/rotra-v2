'use client'
import { useMockMutation } from '../mock/query'
import { setAcceptJoinRequests } from './mutations'
export function useSetAcceptJoinRequests() {
  return useMockMutation(setAcceptJoinRequests)
}
