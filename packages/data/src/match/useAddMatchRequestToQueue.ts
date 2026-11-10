'use client'
import { useMockMutation } from '../mock/query'
import { addMatchRequestToQueue } from './matchRequestDecisions'
/** Requests › Match › Add to queue (toast “Match added to the queue”). */
export function useAddMatchRequestToQueue() {
  return useMockMutation(addMatchRequestToQueue)
}
