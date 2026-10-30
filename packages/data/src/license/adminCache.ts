import type { QueryClient } from '@tanstack/react-query'
import { adminAuditKeys } from '../admin-audit/queryKeys'
import { clubKeys } from '../club/queryKeys'
import { licenseKeys } from './queryKeys'

/** After a license is recorded: the directory, every club detail, the terms and the record. */
export function invalidateLicenseQueries(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: clubKeys.adminLists() }),
    client.invalidateQueries({ queryKey: clubKeys.adminDetails() }),
    client.invalidateQueries({ queryKey: licenseKeys.all }),
    client.invalidateQueries({ queryKey: adminAuditKeys.all }),
  ])
}
