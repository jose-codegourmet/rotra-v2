'use client'
import { useMockMutation } from '../mock/query'
import { restorePreviousClubPlayerPicture } from './setPicture'
export function useUseClubPlayerPreviousPicture() {
  return useMockMutation(restorePreviousClubPlayerPicture)
}
