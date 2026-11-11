'use client'
import { type RegistrationValues, registrationSchema } from '@rotra/schema/registration'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { authKeys } from '../auth/queryKeys'
import { playerKeys } from '../player/queryKeys'
import { playerClubKeys } from '../player-club/queryKeys'
import { completeGuestRegistration, getGuestRegistrationClub } from './guestRegistration'
import { playerAccountKeys } from './queryKeys'

/** `inviteCode` is the club invite link's `k` (#712); the server refuses a missing or old one. */
export function useGuestRegistrationClub(
  clubId: string,
  sessionSlug?: string | null,
  inviteCode?: string | null,
) {
  return useQuery({
    queryKey: [
      ...playerAccountKeys.guestRegistration(clubId),
      sessionSlug ?? null,
      inviteCode ?? null,
    ],
    queryFn: ({ signal }) => getGuestRegistrationClub(clubId, signal, sessionSlug, inviteCode),
    networkMode: 'always',
    retry: false,
  })
}

/** Keep only a random retry secret and a contact fingerprint, never a password or plain contacts. */
export function useGuestRegistration(
  clubId: string,
  sessionSlug?: string | null,
  inviteCode?: string | null,
) {
  const client = useQueryClient()
  const retry = useRef<{ fingerprint: string; attempt: string } | null>(null)
  return useMutation({
    networkMode: 'always',
    mutationFn: async (input: RegistrationValues) => {
      const values = registrationSchema.parse(input)
      const hex = (bytes: Uint8Array) =>
        Array.from(bytes, (n) => n.toString(16).padStart(2, '0')).join('')
      const fingerprint = hex(
        new Uint8Array(
          await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(
              `${clubId}:${sessionSlug ?? ''}:${values.email}:${values.phone}`,
            ),
          ),
        ),
      )
      const key = `rotra-guest-registration:${clubId}:${sessionSlug ?? ''}`
      try {
        retry.current ??= JSON.parse(sessionStorage.getItem(key) ?? 'null')
      } catch {}
      if (
        retry.current?.fingerprint !== fingerprint ||
        !/^[a-f0-9]{64}$/.test(retry.current.attempt)
      ) {
        retry.current = { fingerprint, attempt: hex(crypto.getRandomValues(new Uint8Array(32))) }
      }
      try {
        sessionStorage.setItem(key, JSON.stringify(retry.current))
      } catch {}
      const result = await completeGuestRegistration({
        clubId,
        sessionSlug,
        inviteCode,
        attempt: retry.current.attempt,
        values,
      })
      if (result.status === 'registered') {
        try {
          sessionStorage.removeItem(key)
        } catch {}
      }
      return result
    },
    onSuccess: async (result) => {
      if (result.status !== 'registered') return
      client.setQueryData(authKeys.session('player'), result.session)
      await Promise.all([
        client.invalidateQueries({ queryKey: playerKeys.all }),
        client.invalidateQueries({ queryKey: playerClubKeys.all }),
        client.invalidateQueries({ queryKey: playerAccountKeys.all }),
      ])
    },
  })
}
