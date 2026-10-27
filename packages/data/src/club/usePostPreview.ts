'use client'
import { useQuery } from '@tanstack/react-query'
import { clubKeys } from './queryKeys'
import { getPostPreview } from './settings'
export function usePostPreview(draft: Parameters<typeof getPostPreview>[0]) {
  return useQuery({
    queryKey: [...clubKeys.all, 'preview', draft],
    queryFn: () => getPostPreview(draft),
  })
}
