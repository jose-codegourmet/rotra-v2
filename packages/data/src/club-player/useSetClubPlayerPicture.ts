'use client'
import { useMockMutation } from '../mock/query'
import { setClubPlayerPicture } from './setPicture'
export function useSetClubPlayerPicture() {
  return useMockMutation(setClubPlayerPicture)
}
