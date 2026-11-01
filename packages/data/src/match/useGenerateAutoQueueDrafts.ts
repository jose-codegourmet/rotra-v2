'use client'
import { useMockMutation } from '../mock/query'
import { generateAutoQueueDrafts } from './autoQueue.mutations'
export function useGenerateAutoQueueDrafts() { return useMockMutation(generateAutoQueueDrafts) }
