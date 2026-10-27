'use client'
import { useMockMutation } from '../mock/query'
import { addCourt } from './courts'
export function useAddCourt() {
  return useMockMutation(addCourt)
}
