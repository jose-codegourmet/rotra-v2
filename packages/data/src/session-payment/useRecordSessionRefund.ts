'use client'
import { useMockMutation } from '../mock/query'
import { recordSessionRefund } from './refunds'
/** Cancelled record › Refund everyone who paid › **Record refund** (#1014). */
export function useRecordSessionRefund() {
  return useMockMutation(recordSessionRefund)
}
