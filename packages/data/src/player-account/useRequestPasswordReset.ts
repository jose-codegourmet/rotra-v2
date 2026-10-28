'use client'
import { useMutation } from '@tanstack/react-query'
import { requestPasswordReset } from './fetchers'
export function useRequestPasswordReset() { return useMutation({ mutationFn: requestPasswordReset }) }
