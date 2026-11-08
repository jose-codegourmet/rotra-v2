import type { QueryClient } from '@tanstack/react-query'
import { adminAuditKeys } from '../admin-audit/queryKeys'
import { clubKeys } from '../club/queryKeys'
import { salesKeys } from '../sales/queryKeys'
import { licenseKeys } from './queryKeys'

/** After a license is recorded: the directory, every club detail, the terms, the record and Sales. */
export function invalidateLicenseQueries(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: clubKeys.adminLists() }),
    client.invalidateQueries({ queryKey: clubKeys.adminDetails() }),
    client.invalidateQueries({ queryKey: licenseKeys.all }),
    client.invalidateQueries({ queryKey: adminAuditKeys.all }),
    client.invalidateQueries({ queryKey: salesKeys.all }),
  ])
}
