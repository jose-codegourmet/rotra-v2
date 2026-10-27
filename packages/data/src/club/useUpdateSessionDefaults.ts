'use client'
import { useMockMutation } from '../mock/query'
import { updateSessionDefaults } from './settings'
export function useUpdateSessionDefaults() {
  return useMockMutation(updateSessionDefaults)
}
