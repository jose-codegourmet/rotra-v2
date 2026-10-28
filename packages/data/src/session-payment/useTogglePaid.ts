'use client'
import { useMockMutation } from '../mock/query'
import { togglePaid } from './fetchers'
export function useTogglePaid() { return useMockMutation(togglePaid) }
