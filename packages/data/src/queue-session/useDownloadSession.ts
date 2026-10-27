'use client'
import { useMockMutation } from '../mock/query'
import { downloadSession } from './mutations'
export function useDownloadSession() {
  return useMockMutation(downloadSession)
}
