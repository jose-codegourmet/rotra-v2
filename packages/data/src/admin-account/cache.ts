import type { QueryClient } from '@tanstack/react-query'
import type { AdminSession } from './adminAccount.types'
import { adminAccountKeys } from './queryKeys'
import { notifyAdminSession } from './session'

export async function replaceAdminSession(client: QueryClient, session: AdminSession) {
  await client.cancelQueries()
  // Clear every previous account's query AND mutation data before publishing the next session.
  client.clear()
  if (session.kind === 'owner') {
    client.setQueryData(adminAccountKeys.session(), session)
  }
  notifyAdminSession()
}
