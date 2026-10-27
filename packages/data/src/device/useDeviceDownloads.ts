'use client'
import { useQuery } from '@tanstack/react-query'
import { getDeviceDownloads } from './fetchers'
import { deviceKeys } from './queryKeys'
export function useDeviceDownloads() {
  return useQuery({
    queryKey: [...deviceKeys.all, 'downloads'],
    queryFn: () => getDeviceDownloads(),
  })
}
