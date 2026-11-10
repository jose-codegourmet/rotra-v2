'use client'
import { useMockMutation } from '../mock/query'
import { keepDropOut } from './requestDecisions'
/** Requests › Join › Can't make it › Keep (toast “NAME stays on the roster”). */
export function useKeepDropOut() {
  return useMockMutation(keepDropOut)
}
