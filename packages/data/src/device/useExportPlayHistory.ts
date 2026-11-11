'use client'
import { useMutation } from '@tanstack/react-query'
import { exportPlayHistory } from '../outbox/playHistory'

/** Club settings › This device › Export play history: the `playhistory.json` text (#722). Works offline. */
export function useExportPlayHistory() {
  return useMutation({ mutationFn: () => exportPlayHistory() })
}
