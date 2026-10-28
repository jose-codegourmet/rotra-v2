'use client'
import { useMockMutation } from '../mock/query'
import { answerInterruption } from './fetchers'
export function useAnswerInterruption() { return useMockMutation(answerInterruption) }
