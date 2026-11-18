'use client'
import { useQuery } from '@tanstack/react-query'
import { getGoogleDeadline } from './fetchers'
import { googleSignInKeys } from './queryKeys'

/** The Google deadline: `label` for copy ("Backup only until …") and `passed` for the gates. */
export function useGoogleDeadline() {
  return useQuery({
    queryKey: googleSignInKeys.deadline(),
    queryFn: getGoogleDeadline,
    networkMode: 'always',
    retry: false,
  })
}
