'use client'
import { useMockMutation } from '../mock/query'
import { placeOnCourt } from './control'
export function usePlaceOnCourt() {
  return useMockMutation(placeOnCourt)
}
