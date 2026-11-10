'use client'
import { useMockMutation } from '../mock/query'
import { removeDropOut } from './requestDecisions'
/** Requests › Join › Can't make it › Remove from roster (toast “NAME removed from the roster”). */
export function useRemoveDropOut() {
  return useMockMutation(removeDropOut)
}
