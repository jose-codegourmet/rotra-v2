'use client'

import { connectMockQueryClient } from '@rotra/data/mock/client'
import { MockError } from '@rotra/data/mock/errors'
import { RealRequestError } from '@rotra/data/real/client'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, type ReactNode, Suspense, useEffect, useState } from 'react'

const Devtools =
  process.env.NODE_ENV === 'development'
    ? lazy(() =>
        import('@tanstack/react-query-devtools').then((module) => ({
          default: module.ReactQueryDevtools,
        })),
      )
    : null

let leaving = false

/**
 * A signed-in Queue page whose read is refused with 401 (the club was disabled, or the session ended
 * and could not refresh) goes to sign-in once. The public pages (`/s/...`) are for visitors and stay.
 */
function leaveOnSessionEnd(error: unknown) {
  if (leaving || !(error instanceof RealRequestError) || error.status !== 401) return
  const { pathname } = location
  if (pathname === '/login' || pathname === '/s' || pathname.startsWith('/s/')) return
  leaving = true
  location.assign('/login')
}

/** One QueryClient per mounted app; mock data does not refetch on window focus. */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: leaveOnSessionEnd }),
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
