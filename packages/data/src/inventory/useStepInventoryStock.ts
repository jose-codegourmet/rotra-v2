'use client'
import { useMockMutation } from '../mock/query'
import { stepInventoryStock } from './fetchers'
export function useStepInventoryStock() { return useMockMutation(stepInventoryStock) }
