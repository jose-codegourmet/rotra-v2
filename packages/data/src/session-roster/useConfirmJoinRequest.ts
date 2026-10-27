'use client'
import { useMockMutation } from '../mock/query'
import { confirmJoinRequest } from './mutations'
export function useConfirmJoinRequest() {
  return useMockMutation(confirmJoinRequest)
}
