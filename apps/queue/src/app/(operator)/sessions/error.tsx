'use client'

import { SessionError } from './_components/session-error/SessionError'

export default function SessionsErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return <SessionError error={error} reset={reset} />
}
