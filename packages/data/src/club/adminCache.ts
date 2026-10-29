import type { QueryClient } from '@tanstack/react-query'
import { adminAuditKeys } from '../admin-audit/queryKeys'
import { clubKeys } from './queryKeys'

/** After any Admin club write: the directory, every club detail, the name requests and the record. */
export function invalidateAdminClubQueries(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: clubKeys.adminLists() }),
    client.invalidateQueries({ queryKey: clubKeys.adminDetails() }),
    client.invalidateQueries({ queryKey: clubKeys.nameRequests() }),
    client.invalidateQueries({ queryKey: clubKeys.identityIndex() }),
    client.invalidateQueries({ queryKey: adminAuditKeys.all }),
  ])
}
