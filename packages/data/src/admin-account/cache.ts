import type { QueryClient } from '@tanstack/react-query'
import { isRealDataMode } from '../real/mode'
import type { AdminSession } from './adminAccount.types'
import { adminAccountKeys } from './queryKeys'
import { notifyAdminSession } from './session'

export async function replaceAdminSession(client: QueryClient, session: AdminSession) {
  await client.cancelQueries()
  // Clear every previous account's query AND mutation data before publishing the next session.
  client.clear()
  // Real mode has no mock marker, so every session kind is published through the query.
  if (session.kind === 'owner' || isRealDataMode()) {
    client.setQueryData(adminAccountKeys.session(), session)
  }
  notifyAdminSession()
}
