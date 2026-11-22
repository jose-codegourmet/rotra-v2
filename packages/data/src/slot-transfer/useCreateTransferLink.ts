'use client'
import { useMockMutation } from '../mock/query'
import type { PlayerSessionInput } from '../public-session/publicSession.types'
import { createTransferLink } from './playerTransfers'
/**
 * **Create a transfer link** (#1012): `data.token` is the plaintext token, returned once; build the
 * link with `transferLinkUrl`. Toast “Transfer link ready · share it with the new player”.
 */
export function useCreateTransferLink(slug: string) {
  return useMockMutation((input: PlayerSessionInput) => createTransferLink(slug, input))
}
