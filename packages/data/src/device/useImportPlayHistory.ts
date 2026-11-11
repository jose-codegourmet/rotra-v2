'use client'
import { useMockMutation } from '../mock/query'
import { importPlayHistory } from '../outbox/playHistory'

/**
 * Club settings › This device › Import play history…: loads a `playhistory.json` text onto this
 * device (#722). Its commands join the outbox and replay like this device's own. Works offline.
 */
export function useImportPlayHistory() {
  return useMockMutation((text: string) => importPlayHistory(text))
}
