'use client'
import { useQuery } from '@tanstack/react-query'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { getInventory } from './fetchers'
import { inventoryKeys } from './queryKeys'
export function useInventory() {
  return useQuery({ queryKey: inventoryKeys.list(DEMO_CLUB_ID), queryFn: () => getInventory() })
}
