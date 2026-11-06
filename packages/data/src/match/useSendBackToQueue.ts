'use client'
import { useMockMutation } from '../mock/query'
import { sendBackToQueue } from './control'
export function useSendBackToQueue() {
  return useMockMutation(sendBackToQueue)
}
