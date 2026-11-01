'use client'
import { useMockMutation } from '../mock/query'
import { editAutoQueueDrafts } from './autoQueue.mutations'
export function useEditAutoQueueDrafts() { return useMockMutation(editAutoQueueDrafts) }
