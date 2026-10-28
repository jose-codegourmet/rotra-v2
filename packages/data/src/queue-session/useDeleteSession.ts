'use client'
import { useMockMutation } from '../mock/query'
import { deleteSession } from './mutations'
export function useDeleteSession() {
  return useMockMutation(deleteSession)
}
