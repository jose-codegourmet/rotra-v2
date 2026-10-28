'use client'
import { useMockMutation } from '../mock/query'
import { markAllPaid } from './fetchers'
export function useMarkAllPaid() { return useMockMutation(markAllPaid) }
