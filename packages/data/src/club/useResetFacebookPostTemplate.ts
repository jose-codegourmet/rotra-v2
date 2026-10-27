'use client'
import { useMockMutation } from '../mock/query'
import { resetFacebookPostTemplate } from './settings'
export function useResetFacebookPostTemplate() {
  return useMockMutation(resetFacebookPostTemplate)
}
