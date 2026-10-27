'use client'

import { connectMockQueryClient } from '@rotra/data/mock/client'
import { MockError } from '@rotra/data/mock/errors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, type ReactNode, Suspense, useEffect, useState } from 'react'

const Devtools =
  process.env.NODE_ENV === 'development'
    ? lazy(() =>
        import('@tanstack/react-query-devtools').then((module) => ({
          default: module.ReactQueryDevtools,
        })),
      )
    : null

/** One QueryClient per mounted app; mock data does not refetch on window focus. */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) =>
              failureCount < 1 && (!(error instanceof MockError) || error.kind === 'retryable'),
            refetchOnWindowFocus: false,
          },
        },
      }),
  )
  useEffect(() => connectMockQueryClient(queryClient), [queryClient])
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {Devtools ? (
        <Suspense fallback={null}>
          <Devtools initialIsOpen={false} />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  )
}
