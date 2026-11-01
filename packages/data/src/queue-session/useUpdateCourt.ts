'use client'
import { useMockMutation } from '../mock/query'
import { updateCourt } from './courts'
export function useUpdateCourt() {
  return useMockMutation(updateCourt)
}
