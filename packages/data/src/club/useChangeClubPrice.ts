'use client'

import type { ClubPriceValues } from '@rotra/schema/club-price'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateAdminClubQueries } from './adminCache'
import { changeClubPrice } from './fetchers'

/** A-CLUB-PRICE › Save price; later payments only, recorded license terms keep their amounts. */
export function useChangeClubPrice() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ clubId, price }: { clubId: string; price: ClubPriceValues }) =>
      changeClubPrice(clubId, price),
    networkMode: 'always',
    retry: false,
    onSuccess: () => invalidateAdminClubQueries(client),
  })
}
