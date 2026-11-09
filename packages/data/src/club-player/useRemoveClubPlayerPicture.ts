'use client'
import { useMockMutation } from '../mock/query'
import { removeClubPlayerPicture } from './setPicture'
export function useRemoveClubPlayerPicture() {
  return useMockMutation(removeClubPlayerPicture)
}
