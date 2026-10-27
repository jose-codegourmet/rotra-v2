'use client'
import { useMockMutation } from '../mock/query'
import { extendSession } from './courts'
export function useExtendSession() {
  return useMockMutation(extendSession)
}
