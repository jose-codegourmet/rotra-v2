'use client'
import { useMockMutation } from '../mock/query'
import { declineJoinRequest } from './mutations'
export function useDeclineJoinRequest() {
  return useMockMutation(declineJoinRequest)
}
